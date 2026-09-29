import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
  GoogleSignInDto,
  LoginDto,
  RecoverDto,
  RegisterDto,
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
import { GOOGLE_OIDC, type GoogleOidc } from './google-oidc';
import { HUMAN_CHECK, type HumanCheck } from './turnstile';
import {
  hashRecoveryKey,
  newRecoveryKey,
  normaliseRecoveryKey,
} from './recovery-key';
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
  /** Kenyan mobile, E.164; null for email-only accounts. */
  phone: string | null;
  /** An SMS code proved the phone (false for password sign-ups, ADR 0021). */
  phoneVerified: boolean;
  /** Has a recovery key for a forgotten password (ADR 0021). */
  hasRecoveryKey: boolean;
  displayName: string | null;
  /** "en" or "sw". */
  locale: string;
  /** When the account was created (ISO 8601). */
  createdAt: string;
  totpEnabled: boolean;
  recoveryCodesLeft: number;
  /** Runs the service: sees /operator (B9). */
  operator: boolean;
  /** False for accounts that sign in with Google only (ADR 0020). */
  hasPassword: boolean;
  /** Signs in with "Continue with Google". */
  google: boolean;
  plan: 'plus' | 'free';
  /** When Plus (or the trial) ends; null if never had it. */
  plusUntil: string | null;
  /** Has ever paid for Plus (not only the trial or free months). */
  paidPlus: boolean;
  /** When the owner last downloaded an encrypted backup (C2). */
  lastBackupAt: string | null;
}

/** One message for every login failure, so it never reveals which part was wrong. */
const INVALID_LOGIN = 'Those sign-in details are not right.';
const GOOGLE_FAILED = 'Signing in with Google did not work. Try again.';
const GOOGLE_UNVERIFIED =
  'Google has not verified the email on that account yet. Verify it with Google, then try again.';
const GOOGLE_OTHER_ACCOUNT =
  'That email already belongs to an account linked to a different Google account.';
const NO_ACCOUNT =
  'There is no Contact Sphere account for this Google account.';
const NO_PASSWORD =
  'This account signs in with Google, so it has no password to change.';
const NOT_A_MOBILE = 'Enter a Kenyan mobile number, like 0712 345 678.';
const NUMBER_TAKEN = 'This number already has an account. Sign in instead.';
/** One message for every failed recovery, like INVALID_LOGIN. */
const RECOVERY_FAILED =
  'That account and recovery key do not match. Check both and try again.';
const NOT_HUMAN = 'Please confirm you are not a robot, then try again.';
const TOO_MANY_ATTEMPTS =
  'Too many failed attempts for this account. Try again in 15 minutes.';

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
    @Inject(GOOGLE_OIDC) private readonly google: GoogleOidc | null,
    @Inject(HUMAN_CHECK) private readonly human: HumanCheck | null,
  ) {}

  /** Cloudflare Turnstile, when configured (C3); a no-op otherwise. */
  private async requireHuman(token: string | undefined): Promise<void> {
    if (this.human && !(await this.human.verify(token))) {
      throw new BadRequestException(NOT_HUMAN);
    }
  }

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
      throw new HttpException(TOO_MANY_ATTEMPTS, HttpStatus.TOO_MANY_REQUESTS);
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
    return this.finishSignIn(user, device, 'password');
  }

  /**
   * The identity is proven (password or Google): a two-factor challenge
   * when two-factor is on, else a session.
   */
  private async finishSignIn(
    user: {
      id: string;
      email: string | null;
      phone: string | null;
      totpEnabledAt: Date | null;
    },
    device: string | null | undefined,
    method: 'password' | 'google',
  ): Promise<SessionResult | MfaRequired> {
    if (user.totpEnabledAt) {
      // The first factor alone is not enough: a short-lived challenge.
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
      device ?? undefined,
    );
    await this.audit.record('auth.login_succeeded', {
      actorUserId: user.id,
      entityType: 'user',
      entityId: user.id,
      ...(method === 'google' ? { metadata: { method } } : {}),
    });
    return {
      ...session,
      user: { id: user.id, email: user.email, phone: user.phone },
    };
  }

  /**
   * "Continue with Google" (ADR 0020). Google proves the email; we then
   * sign in the account with this Google id, or link the account with the
   * same verified email, or — when sign-up with Google is open — create one
   * on the Plus trial.
   */
  async googleSignIn(
    dto: GoogleSignInDto,
    device: string | null,
  ): Promise<SessionResult | MfaRequired> {
    if (!this.google || !this.env.google) throw new NotFoundException();
    const allowed = this.env.webOrigins.map((o) => `${o}/auth/google/callback`);
    if (!allowed.includes(dto.redirectUri)) {
      throw new BadRequestException(GOOGLE_FAILED);
    }
    const claims = await this.google.exchange(
      dto.code,
      dto.codeVerifier,
      dto.redirectUri,
    );
    if (!claims || !claims.nonce || !secretsEqual(claims.nonce, dto.nonce)) {
      throw new BadRequestException(GOOGLE_FAILED);
    }
    if (!claims.emailVerified) {
      throw new BadRequestException(GOOGLE_UNVERIFIED);
    }
    const select = {
      id: true,
      email: true,
      phone: true,
      totpEnabledAt: true,
      googleSub: true,
    } as const;
    let user = await this.prisma.user.findUnique({
      where: { googleSub: claims.sub },
      select,
    });
    if (!user) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email: claims.email },
        select,
      });
      if (byEmail?.googleSub) {
        // That email belongs to an account linked to another Google id.
        throw new ConflictException(GOOGLE_OTHER_ACCOUNT);
      }
      if (byEmail) {
        user = await this.prisma.$transaction(async (tx) => {
          const u = await tx.user.update({
            where: { id: byEmail.id },
            data: { googleSub: claims.sub },
            select,
          });
          await this.audit.record(
            'auth.google_linked',
            { actorUserId: u.id, entityType: 'user', entityId: u.id },
            tx,
          );
          return u;
        });
      }
    }
    if (!user) {
      if (!this.googleSignupOpen()) throw new ForbiddenException(NO_ACCOUNT);
      const name = claims.name?.trim().slice(0, 100) || null;
      user = await this.prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            email: claims.email,
            googleSub: claims.sub,
            displayName: name,
            locale: dto.locale ?? 'en',
            // Everyone starts with a Plus trial (B9, ADR 0019).
            plusUntil: new Date(Date.now() + TRIAL_DAYS * 86_400_000),
          },
          select,
        });
        await this.audit.record(
          'auth.signup_completed',
          {
            actorUserId: u.id,
            entityType: 'user',
            entityId: u.id,
            metadata: { method: 'google' },
          },
          tx,
        );
        return u;
      });
    }
    return this.finishSignIn(user, device, 'google');
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
        passwordHash: true,
        googleSub: true,
        phoneVerifiedAt: true,
        recoveryKeyHash: true,
        lastBackupAt: true,
      },
    });
    // A session whose user vanished cannot happen (cascade), but never
    // answer "who am I" with nothing.
    if (!user) throw new UnauthorizedException();
    const paid = await this.prisma.payment.count({
      where: {
        ownerId: userId,
        status: 'paid',
        method: { in: ['mpesa_stk', 'manual'] },
      },
    });
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      phoneVerified: user.phoneVerifiedAt !== null,
      hasRecoveryKey: user.recoveryKeyHash !== null,
      displayName: user.displayName,
      locale: user.locale,
      createdAt: user.createdAt.toISOString(),
      totpEnabled: user.totpEnabledAt !== null,
      recoveryCodesLeft: user.totpEnabledAt
        ? await this.totp.remainingRecoveryCodes(userId)
        : 0,
      operator: user.role === 'operator',
      hasPassword: user.passwordHash !== null,
      google: user.googleSub !== null,
      plan:
        user.role === 'operator' ||
        (!!user.plusUntil && user.plusUntil > new Date())
          ? 'plus'
          : 'free',
      plusUntil: user.plusUntil?.toISOString() ?? null,
      paidPlus: paid > 0,
      lastBackupAt: user.lastBackupAt?.toISOString() ?? null,
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

  /** Can new people join by SMS code (B6)? */
  smsSignupOpen(): boolean {
    return (
      this.env.openSignup &&
      this.env.signupMethods.includes('sms') &&
      this.codes.enabled
    );
  }

  /** Can new people join with Google (ADR 0020)? */
  googleSignupOpen(): boolean {
    return (
      this.env.openSignup &&
      this.env.signupMethods.includes('google') &&
      !!this.google
    );
  }

  /** Can new people join with a phone number and a password (ADR 0021)? */
  passwordSignupOpen(): boolean {
    return this.env.openSignup && this.env.signupMethods.includes('password');
  }

  /** Is open sign-up on here, by any method? */
  signupOpen(): boolean {
    return (
      this.smsSignupOpen() ||
      this.googleSignupOpen() ||
      this.passwordSignupOpen()
    );
  }

  /**
   * What the sign-in pages offer. The Google client id is public (it is in
   * every "Continue with Google" link).
   */
  signupStatus(): {
    open: boolean;
    sms: boolean;
    google: boolean;
    password: boolean;
    googleClientId: string | null;
    turnstileSiteKey: string | null;
  } {
    return {
      open: this.signupOpen(),
      sms: this.smsSignupOpen(),
      google: this.googleSignupOpen(),
      password: this.passwordSignupOpen(),
      googleClientId: this.google ? (this.env.google?.clientId ?? null) : null,
      // Public by design: it is in the sign-up page.
      turnstileSiteKey: this.human
        ? (this.env.turnstile?.siteKey ?? null)
        : null,
    };
  }

  /**
   * Sign-up with a phone number and a password, no code (ADR 0021). The
   * number is a username, marked not verified. The answer carries a
   * recovery key, shown to the owner once: with the number it resets a
   * forgotten password when there is no SMS.
   */
  async register(
    dto: RegisterDto,
    device: string | null = null,
  ): Promise<SessionResult & { recoveryKey: string }> {
    if (!this.passwordSignupOpen()) throw new NotFoundException();
    await this.requireHuman(dto.turnstileToken);
    const phone = kenyanMobile(dto.phone);
    if (!phone) throw new BadRequestException(NOT_A_MOBILE);
    const problem = passwordProblem(dto.password, phone);
    if (problem) throw new BadRequestException(problem);
    await this.refuseBreached(dto.password);
    const passwordHash = await hashPassword(dto.password);
    const recoveryKey = newRecoveryKey();
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            phone,
            passwordHash,
            recoveryKeyHash: hashRecoveryKey(recoveryKey),
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
          {
            actorUserId: user.id,
            entityType: 'user',
            entityId: user.id,
            metadata: { method: 'password' },
          },
          tx,
        );
        return { ...session, user };
      });
      return { ...result, recoveryKey };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(NUMBER_TAKEN);
      }
      throw err;
    }
  }

  /**
   * Forgot password without SMS (ADR 0021): the phone (or email) and the
   * recovery key. Counts toward the same lock-out as sign-in, so the key
   * cannot be guessed. Sets the new password, signs every device out and
   * returns a NEW key: a key works once.
   */
  async recover(dto: RecoverDto): Promise<{ recoveryKey: string }> {
    const typed = dto.identifier.trim();
    const email = typed.includes('@') ? typed.toLowerCase() : null;
    const phone = email ? null : kenyanMobile(typed);
    if (!email && !phone) throw new BadRequestException(NOT_A_MOBILE);
    const key = hashToken((email ?? phone) as string);
    if (await this.failures.isLocked(key)) {
      throw new HttpException(TOO_MANY_ATTEMPTS, HttpStatus.TOO_MANY_REQUESTS);
    }
    // The password rules first: a weak new password spends no attempt.
    const problem = passwordProblem(
      dto.newPassword,
      (email ?? phone) as string,
    );
    if (problem) throw new BadRequestException(problem);
    await this.refuseBreached(dto.newPassword);

    const user = await this.prisma.user.findUnique({
      where: email ? { email } : { phone: phone as string },
      select: { id: true, recoveryKeyHash: true },
    });
    const typedKey = normaliseRecoveryKey(dto.recoveryKey);
    const ok =
      !!user?.recoveryKeyHash &&
      !!typedKey &&
      secretsEqual(hashRecoveryKey(typedKey), user.recoveryKeyHash);
    if (!user || !ok) {
      await this.failures.record(key);
      await this.audit.record('auth.recovery_failed', {
        entityType: user ? 'user' : undefined,
        entityId: user?.id,
      });
      throw new BadRequestException(RECOVERY_FAILED);
    }

    const recoveryKey = newRecoveryKey();
    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, recoveryKeyHash: hashRecoveryKey(recoveryKey) },
      });
      await this.sessions.revokeAll(user.id, undefined, tx);
      await this.audit.record(
        'auth.password_recovered',
        { actorUserId: user.id, entityType: 'user', entityId: user.id },
        tx,
      );
    });
    await this.failures.clear(key);
    return { recoveryKey };
  }

  /**
   * A new recovery key for a signed-in owner (lost the old one, or never
   * had one). The password proves it is them; the old key stops working.
   */
  async newRecoveryKeyFor(
    userId: string,
    password: string,
  ): Promise<{ recoveryKey: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (user.passwordHash === null) throw new BadRequestException(NO_PASSWORD);
    if (!(await verifyPassword(user.passwordHash, password))) {
      throw new UnauthorizedException('Your password is not correct.');
    }
    const recoveryKey = newRecoveryKey();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { recoveryKeyHash: hashRecoveryKey(recoveryKey) },
      });
      await this.audit.record(
        'auth.recovery_key_created',
        { actorUserId: userId, entityType: 'user', entityId: userId },
        tx,
      );
    });
    return { recoveryKey };
  }

  /** Step 1 of sign-up: text a code to the number (B6). */
  async sendSignupCode(
    phone: string,
    locale?: 'en' | 'sw',
    turnstileToken?: string,
  ): Promise<void> {
    if (!this.smsSignupOpen()) throw new NotFoundException();
    // Every text costs money: people only.
    await this.requireHuman(turnstileToken);
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
    if (!this.smsSignupOpen()) throw new NotFoundException();
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
            // The code just proved it.
            phoneVerifiedAt: new Date(),
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
  async sendResetCode(
    phone: string,
    locale?: 'en' | 'sw',
    turnstileToken?: string,
  ): Promise<void> {
    if (!this.codes.enabled) throw new NotFoundException();
    await this.requireHuman(turnstileToken);
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
      select: { id: true, phoneVerifiedAt: true },
    });
    // Unknown and never-verified numbers are never texted a reset code
    // (ADR 0021), so a right code means an account proven by this number.
    if (!user?.phoneVerifiedAt) {
      throw new BadRequestException('That code is not right.');
    }
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
    password: string | undefined,
    code: string | undefined,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true, totpEnabledAt: true },
    });
    // Google-only accounts have no password: the session, the typed word
    // and (when on) the second factor are the proof.
    if (
      user.passwordHash !== null &&
      !(await verifyPassword(user.passwordHash, password ?? ''))
    ) {
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
    if (user.passwordHash === null) throw new BadRequestException(NO_PASSWORD);
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
