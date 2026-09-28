import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { TRIAL_DAYS } from '../billing/plans.service';
import type { Env } from '../config/env';
import { ENV } from '../config/env.provider';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ChangePasswordDto,
  LoginDto,
  ResetPasswordDto,
  SetupDto,
  SignupDto,
} from './dto/credentials.dto';
import { BreachedPasswords } from './breached-passwords';
import { LoginFailures } from './login-failures';
import { kenyanMobile } from './mobile';
import { PhoneCodes } from './phone-codes.service';
import {
  hashPassword,
  passwordProblem,
  verifyAgainstDummy,
  verifyPassword,
} from './password';
import {
  type IssuedSession,
  SessionService,
  type SessionView,
} from './session.service';
import { hashToken, newSessionToken, secretsEqual } from './tokens';
import { TotpService } from './totp.service';
import { MFA_CHALLENGE_MS, MFA_MAX_ATTEMPTS } from './auth.constants';

export interface SessionResult extends IssuedSession {
  user: { id: string; email: string | null; phone: string | null };
}

/** Password was right; the second factor is still needed (ADR 0013). */
export interface MfaRequired {
  mfaRequired: true;
  challenge: string;
  expiresAt: Date;
}

export interface Me {
  id: string;
  /** Null for accounts made by phone (B6). */
  email: string | null;
  /** Verified Kenyan mobile, E.164; null for email-only accounts. */
  phone: string | null;
  displayName: string | null;
  /** "en" or "sw". */
  locale: string;
  /** When the account was created (ISO 8601). */
  createdAt: string;
  totpEnabled: boolean;
  recoveryCodesLeft: number;
  /** Runs the service: sees /operator (B9). */
  operator: boolean;
  plan: 'plus' | 'free';
  /** When Plus (or the trial) ends; null if never had it. */
  plusUntil: string | null;
}

/** One message for every login failure, so it never reveals which part was wrong. */
const INVALID_LOGIN = 'Those sign-in details are not right.';

const BREACHED_PASSWORD =
  'This password has appeared in known data breaches, so attackers try it first. Choose a different one.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
    private readonly totp: TotpService,
    private readonly failures: LoginFailures,
    private readonly breached: BreachedPasswords,
    private readonly codes: PhoneCodes,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Setup is possible only with a configured token and no account yet. */
  async setupAvailable(): Promise<boolean> {
    if (!this.env.setupToken) return false;
    return (await this.prisma.user.count()) === 0;
  }

  /**
   * Creates the first (owner) account. Single-user first release (ADR 0004):
   * there is no public sign-up, and this door closes once an account exists.
   */
  async setup(
    dto: SetupDto,
    device: string | null = null,
  ): Promise<SessionResult> {
    const configured = this.env.setupToken;
    if (!configured) throw new NotFoundException();
    if (!secretsEqual(dto.setupToken, configured)) {
      throw new UnauthorizedException('Invalid setup token.');
    }
    const problem = passwordProblem(dto.password, dto.email);
    if (problem) throw new BadRequestException(problem);
    await this.refuseBreached(dto.password);

    const passwordHash = await hashPassword(dto.password);
    return this.prisma.$transaction(async (tx) => {
      // Serialise concurrent setups: two simultaneous requests must not both
      // see "no users" and both create an owner.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('contact-sphere:setup'))`;
      if ((await tx.user.count()) > 0) {
        throw new ConflictException('Setup has already been completed.');
      }
      const user = await tx.user.create({
        // The first account runs the service (B9, ADR 0019).
        data: { email: dto.email, passwordHash, role: 'operator' },
        select: { id: true, email: true, phone: true },
      });
      const session = await this.sessions.create(
        user.id,
        new Date(),
        tx,
        device,
      );
      await this.audit.record(
        'auth.setup_completed',
        { actorUserId: user.id, entityType: 'user', entityId: user.id },
        tx,
      );
      return { ...session, user };
    });
  }

  async login(
    dto: LoginDto,
    device: string | null = null,
  ): Promise<SessionResult | MfaRequired> {
    const phone = dto.phone ? kenyanMobile(dto.phone) : null;
    const email = dto.email?.toLowerCase() ?? null;
    if (!email && !dto.phone) {
      throw new BadRequestException('Enter your email or phone number.');
    }
    // One lock-out key per account identifier, however it was typed.
    const key = hashToken(email ?? phone ?? dto.phone ?? '');
    if (await this.failures.isLocked(key)) {
      throw new HttpException(
        'Too many failed attempts for this account. Try again in 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const where = email ? { email } : phone ? { phone } : null;
    const user = where
      ? await this.prisma.user.findUnique({
          where,
          select: {
            id: true,
            email: true,
            phone: true,
            passwordHash: true,
            totpEnabledAt: true,
          },
        })
      : null;

    const ok = user
      ? await verifyPassword(user.passwordHash, dto.password)
      : (await verifyAgainstDummy(dto.password), false);

    if (!user || !ok) {
      await this.failures.record(key);
      await this.audit.record('auth.login_failed', {
        // The account's id when one exists; never the email that was typed.
        entityType: user ? 'user' : undefined,
        entityId: user?.id,
        metadata: { reason: user ? 'wrong_password' : 'unknown_account' },
      });
      throw new UnauthorizedException(INVALID_LOGIN);
    }

    await this.failures.clear(key);

    if (user.totpEnabledAt) {
      // The password alone is not enough: issue a short-lived challenge.
      const challenge = newSessionToken();
      const expiresAt = new Date(Date.now() + MFA_CHALLENGE_MS);
      await this.prisma.mfaChallenge.create({
        data: { userId: user.id, tokenHash: hashToken(challenge), expiresAt },
      });
      await this.audit.record('auth.mfa_challenged', {
        actorUserId: user.id,
        entityType: 'user',
        entityId: user.id,
      });
      return { mfaRequired: true, challenge, expiresAt };
    }

    const session = await this.sessions.create(
      user.id,
      undefined,
      undefined,
      device,
    );
    await this.audit.record('auth.login_succeeded', {
      actorUserId: user.id,
      entityType: 'user',
      entityId: user.id,
    });
    return {
      ...session,
      user: { id: user.id, email: user.email, phone: user.phone },
    };
  }

  /** Second step of sign-in: the challenge plus a TOTP or recovery code. */
  async completeMfa(
    challenge: string,
    code: string,
    device: string | null = null,
  ): Promise<SessionResult> {
    const found = await this.prisma.mfaChallenge.findUnique({
      where: { tokenHash: hashToken(challenge) },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        attempts: true,
        user: { select: { email: true, phone: true } },
      },
    });
    const expired = !found || found.expiresAt <= new Date();
    if (expired || found.attempts >= MFA_MAX_ATTEMPTS) {
      if (found) {
        await this.prisma.mfaChallenge.deleteMany({ where: { id: found.id } });
      }
      throw new UnauthorizedException(
        'That sign-in has expired. Enter your email and password again.',
      );
    }

    const ok = await this.totp.verifySecondFactor(found.userId, code);
    if (!ok) {
      await this.prisma.mfaChallenge.update({
        where: { id: found.id },
        data: { attempts: { increment: 1 } },
      });
      await this.audit.record('auth.mfa_failed', {
        entityType: 'user',
        entityId: found.userId,
      });
      throw new UnauthorizedException('That code is not right.');
    }

    await this.prisma.mfaChallenge.deleteMany({ where: { id: found.id } });
    const session = await this.sessions.create(
      found.userId,
      undefined,
      undefined,
      device,
    );
    await this.audit.record('auth.login_succeeded', {
      actorUserId: found.userId,
      entityType: 'user',
      entityId: found.userId,
      metadata: { second_factor: true },
    });
    return {
      ...session,
      user: {
        id: found.userId,
        email: found.user.email,
        phone: found.user.phone,
      },
    };
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    await this.sessions.revoke(sessionId);
    await this.audit.record('auth.logout', {
      actorUserId: userId,
      entityType: 'session',
      entityId: sessionId,
    });
  }

  sessionList(
    userId: string,
    current: string,
  ): Promise<(SessionView & { current: boolean })[]> {
    return this.sessions
      .list(userId)
      .then((rows) => rows.map((r) => ({ ...r, current: r.id === current })));
  }

  /** Signs one other device out. This device uses "Sign out" instead. */
  async endSession(
    userId: string,
    currentSessionId: string,
    sessionId: string,
  ): Promise<void> {
    if (sessionId === currentSessionId) {
      throw new BadRequestException('Use “Sign out” to leave this device.');
    }
    if (!(await this.sessions.revokeOwn(userId, sessionId))) {
      throw new NotFoundException('That device is already signed out.');
    }
    await this.audit.record('auth.session_ended', {
      actorUserId: userId,
      entityType: 'session',
      entityId: sessionId,
    });
  }

  async logoutAll(userId: string): Promise<void> {
    const count = await this.sessions.revokeAll(userId);
    await this.audit.record('auth.logout_all', {
      actorUserId: userId,
      entityType: 'user',
      entityId: userId,
      metadata: { sessions_ended: count },
    });
  }

  async me(userId: string): Promise<Me> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
        locale: true,
        createdAt: true,
        totpEnabledAt: true,
        role: true,
        plusUntil: true,
      },
    });
    // A session whose user vanished cannot happen (cascade), but never
    // answer "who am I" with nothing.
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      locale: user.locale,
      createdAt: user.createdAt.toISOString(),
      totpEnabled: user.totpEnabledAt !== null,
      recoveryCodesLeft: user.totpEnabledAt
        ? await this.totp.remainingRecoveryCodes(userId)
        : 0,
      operator: user.role === 'operator',
      plan:
        user.role === 'operator' ||
        (!!user.plusUntil && user.plusUntil > new Date())
          ? 'plus'
          : 'free',
      plusUntil: user.plusUntil?.toISOString() ?? null,
    };
  }

  /** Sets (or, with an empty name, clears) how the app greets the owner. */
  async updateProfile(userId: string, displayName?: string): Promise<Me> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { displayName: displayName ?? null },
      });
      await this.audit.record(
        'auth.profile_updated',
        { actorUserId: userId, entityType: 'user', entityId: userId },
        tx,
      );
    });
    return this.me(userId);
  }

  /** The owner's language, for text the server writes (reminders). */
  async setLocale(userId: string, locale: 'en' | 'sw'): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { locale } });
  }

  private async refuseBreached(password: string): Promise<void> {
    const seen = await this.breached.timesSeen(password);
    if (seen && seen > 0) {
      throw new BadRequestException(BREACHED_PASSWORD);
    }
  }

  /** Is open sign-up on here? Public: the web shows or hides the link. */
  signupOpen(): boolean {
    return this.env.openSignup && this.codes.enabled;
  }

  /** Step 1 of sign-up: text a code to the number (B6). */
  async sendSignupCode(phone: string, locale?: 'en' | 'sw'): Promise<void> {
    if (!this.signupOpen()) throw new NotFoundException();
    await this.codes.send('signup', phone, locale);
  }

  /**
   * Step 2: the code proves the number; the account is made and signed in.
   * The password rules and the breached-password check apply as at setup.
   */
  async signup(
    dto: SignupDto,
    device: string | null = null,
  ): Promise<SessionResult> {
    if (!this.signupOpen()) throw new NotFoundException();
    const phone = this.codes.mobile(dto.phone);
    const problem = passwordProblem(dto.password, phone);
    if (problem) throw new BadRequestException(problem);
    await this.refuseBreached(dto.password);
    await this.codes.verify('signup', phone, dto.code);
    const passwordHash = await hashPassword(dto.password);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            phone,
            passwordHash,
            displayName: dto.displayName ?? null,
            locale: dto.locale ?? 'en',
            // Everyone starts with a Plus trial (B9, ADR 0019).
            plusUntil: new Date(Date.now() + TRIAL_DAYS * 86_400_000),
          },
          select: { id: true, email: true, phone: true },
        });
        const session = await this.sessions.create(
          user.id,
          new Date(),
          tx,
          device,
        );
        await this.audit.record(
          'auth.signup_completed',
          { actorUserId: user.id, entityType: 'user', entityId: user.id },
          tx,
        );
        return { ...session, user };
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'This number already has an account. Sign in instead.',
        );
      }
      throw err;
    }
  }

  /** Forgot password, step 1: a code to the account's number, if any. */
  async sendResetCode(phone: string, locale?: 'en' | 'sw'): Promise<void> {
    if (!this.codes.enabled) throw new NotFoundException();
    await this.codes.send('reset', phone, locale);
  }

  /**
   * Forgot password, step 2: the code proves the phone; the new password is
   * set, every device is signed out and the lock-out is cleared.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    if (!this.codes.enabled) throw new NotFoundException();
    const phone = this.codes.mobile(dto.phone);
    const problem = passwordProblem(dto.newPassword, phone);
    if (problem) throw new BadRequestException(problem);
    await this.refuseBreached(dto.newPassword);
    await this.codes.verify('reset', phone, dto.code);
    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    // Unknown numbers are never texted a code, so a right code means an account.
    if (!user) throw new BadRequestException('That code is not right.');
    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await this.sessions.revokeAll(user.id, undefined, tx);
      await this.audit.record(
        'auth.password_reset',
        { actorUserId: user.id, entityType: 'user', entityId: user.id },
        tx,
      );
    });
    await this.failures.clear(hashToken(phone));
  }

  /**
   * Deletes the account and everything in it, for good (B7; Kenya DPA s.40,
   * the right to erasure). Needs the password and, when two-factor is on, a
   * code — a stolen session alone cannot do it. One transaction: contacts,
   * numbers, groups, follow-ups, sessions, devices and settings all go via
   * ON DELETE CASCADE. The audit log keeps an entry with ids and counts only;
   * its actor becomes null with the user (FK SET NULL).
   */
  async deleteAccount(
    userId: string,
    password: string,
    code: string | undefined,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true, totpEnabledAt: true },
    });
    if (!(await verifyPassword(user.passwordHash, password))) {
      throw new UnauthorizedException('Your password is not correct.');
    }
    if (user.totpEnabledAt) {
      if (!code) {
        throw new BadRequestException(
          'Enter a code from your authenticator app.',
        );
      }
      if (!(await this.totp.verifySecondFactor(userId, code))) {
        throw new UnauthorizedException('That code is not right.');
      }
    }
    await this.prisma.$transaction(async (tx) => {
      const [contacts, groups] = await Promise.all([
        tx.contact.count({ where: { ownerId: userId } }),
        tx.group.count({ where: { ownerId: userId } }),
      ]);
      await this.audit.record(
        'auth.account_deleted',
        {
          actorUserId: userId,
          entityType: 'user',
          entityId: userId,
          metadata: { contacts, groups },
        },
        tx,
      );
      await tx.user.delete({ where: { id: userId } });
    });
  }

  /** Changes the password and signs out every OTHER session. */
  async changePassword(
    userId: string,
    sessionId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, phone: true, passwordHash: true },
    });
    if (!(await verifyPassword(user.passwordHash, dto.currentPassword))) {
      throw new UnauthorizedException('Your current password is not correct.');
    }
    const problem = passwordProblem(
      dto.newPassword,
      user.email ?? user.phone ?? '',
    );
    if (problem) throw new BadRequestException(problem);
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(
        'Choose a password different from your current one.',
      );
    }
    await this.refuseBreached(dto.newPassword);

    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      const ended = await this.sessions.revokeAll(userId, sessionId, tx);
      await this.audit.record(
        'auth.password_changed',
        {
          actorUserId: userId,
          entityType: 'user',
          entityId: userId,
          metadata: { other_sessions_ended: ended },
        },
        tx,
      );
    });
  }
}
