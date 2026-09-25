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
import type { Env } from '../config/env';
import { ENV } from '../config/env.provider';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ChangePasswordDto,
  LoginDto,
  SetupDto,
} from './dto/credentials.dto';
import { LoginFailures } from './login-failures';
import {
  hashPassword,
  passwordProblem,
  verifyAgainstDummy,
  verifyPassword,
} from './password';
import { type IssuedSession, SessionService } from './session.service';
import { hashToken, newSessionToken, secretsEqual } from './tokens';
import { TotpService } from './totp.service';
import { MFA_CHALLENGE_MS, MFA_MAX_ATTEMPTS } from './auth.constants';

export interface SessionResult extends IssuedSession {
  user: { id: string; email: string };
}

/** Password was right; the second factor is still needed (ADR 0013). */
export interface MfaRequired {
  mfaRequired: true;
  challenge: string;
  expiresAt: Date;
}

export interface Me {
  id: string;
  email: string;
  totpEnabled: boolean;
  recoveryCodesLeft: number;
}

/** One message for every login failure, so it never reveals which part was wrong. */
const INVALID_LOGIN = 'Invalid email or password.';

@Injectable()
export class AuthService {
  private readonly failures = new LoginFailures();

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
    private readonly totp: TotpService,
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
  async setup(dto: SetupDto): Promise<SessionResult> {
    const configured = this.env.setupToken;
    if (!configured) throw new NotFoundException();
    if (!secretsEqual(dto.setupToken, configured)) {
      throw new UnauthorizedException('Invalid setup token.');
    }
    const problem = passwordProblem(dto.password, dto.email);
    if (problem) throw new BadRequestException(problem);

    const passwordHash = await hashPassword(dto.password);
    return this.prisma.$transaction(async (tx) => {
      // Serialise concurrent setups: two simultaneous requests must not both
      // see "no users" and both create an owner.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('contact-sphere:setup'))`;
      if ((await tx.user.count()) > 0) {
        throw new ConflictException('Setup has already been completed.');
      }
      const user = await tx.user.create({
        data: { email: dto.email, passwordHash },
        select: { id: true, email: true },
      });
      const session = await this.sessions.create(user.id, new Date(), tx);
      await this.audit.record(
        'auth.setup_completed',
        { actorUserId: user.id, entityType: 'user', entityId: user.id },
        tx,
      );
      return { ...session, user };
    });
  }

  async login(dto: LoginDto): Promise<SessionResult | MfaRequired> {
    const key = hashToken(dto.email);
    if (this.failures.isLocked(key)) {
      throw new HttpException(
        'Too many failed attempts for this account. Try again in 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        totpEnabledAt: true,
      },
    });

    const ok = user
      ? await verifyPassword(user.passwordHash, dto.password)
      : (await verifyAgainstDummy(dto.password), false);

    if (!user || !ok) {
      this.failures.record(key);
      await this.audit.record('auth.login_failed', {
        // The account's id when one exists; never the email that was typed.
        entityType: user ? 'user' : undefined,
        entityId: user?.id,
        metadata: { reason: user ? 'wrong_password' : 'unknown_account' },
      });
      throw new UnauthorizedException(INVALID_LOGIN);
    }

    this.failures.clear(key);

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

    const session = await this.sessions.create(user.id);
    await this.audit.record('auth.login_succeeded', {
      actorUserId: user.id,
      entityType: 'user',
      entityId: user.id,
    });
    return { ...session, user: { id: user.id, email: user.email } };
  }

  /** Second step of sign-in: the challenge plus a TOTP or recovery code. */
  async completeMfa(challenge: string, code: string): Promise<SessionResult> {
    const found = await this.prisma.mfaChallenge.findUnique({
      where: { tokenHash: hashToken(challenge) },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        attempts: true,
        user: { select: { email: true } },
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
    const session = await this.sessions.create(found.userId);
    await this.audit.record('auth.login_succeeded', {
      actorUserId: found.userId,
      entityType: 'user',
      entityId: found.userId,
      metadata: { second_factor: true },
    });
    return {
      ...session,
      user: { id: found.userId, email: found.user.email },
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
      select: { id: true, email: true, totpEnabledAt: true },
    });
    // A session whose user vanished cannot happen (cascade), but never
    // answer "who am I" with nothing.
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      totpEnabled: user.totpEnabledAt !== null,
      recoveryCodesLeft: user.totpEnabledAt
        ? await this.totp.remainingRecoveryCodes(userId)
        : 0,
    };
  }

  /** Changes the password and signs out every OTHER session. */
  async changePassword(
    userId: string,
    sessionId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, passwordHash: true },
    });
    if (!(await verifyPassword(user.passwordHash, dto.currentPassword))) {
      throw new UnauthorizedException('Your current password is not correct.');
    }
    const problem = passwordProblem(dto.newPassword, user.email);
    if (problem) throw new BadRequestException(problem);
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(
        'Choose a password different from your current one.',
      );
    }

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
