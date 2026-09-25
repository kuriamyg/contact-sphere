import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import type { Env } from '../config/env';
import { ENV } from '../config/env.provider';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { verifyPassword } from './password';
import { open, seal } from './secret-box';
import {
  hashRecoveryCode,
  looksLikeRecoveryCode,
  newRecoveryCodes,
  newTotpSecret,
  totpUri,
  verifyTotp,
} from './totp';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * Two-factor authentication with an authenticator app (ADR 0013).
 * Enrolment: setup() → the user scans the QR code → enable(code) returns
 * recovery codes, shown once.
 */
@Injectable()
export class TotpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Starts (or restarts) enrolment. Not active until confirmed by enable(). */
  async setup(userId: string): Promise<{ secret: string; uri: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, totpEnabledAt: true },
    });
    if (user.totpEnabledAt) {
      throw new ConflictException('Two-factor is already on.');
    }
    const secret = newTotpSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: seal(secret, this.env.totpEncryptionKey),
        totpLastStep: null,
      },
    });
    return { secret, uri: totpUri(secret, user.email) };
  }

  /** Confirms enrolment with a first code; returns fresh recovery codes. */
  async enable(
    userId: string,
    sessionId: string,
    code: string,
  ): Promise<{ recoveryCodes: string[] }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { totpSecret: true, totpEnabledAt: true },
    });
    if (user.totpEnabledAt) {
      throw new ConflictException('Two-factor is already on.');
    }
    if (!user.totpSecret) {
      throw new BadRequestException('Start two-factor setup first.');
    }
    const step = verifyTotp(this.decrypt(user.totpSecret), code, null);
    if (step === null) {
      throw new BadRequestException(
        'That code is not right. Check the time on your phone and try the newest code.',
      );
    }
    const codes = newRecoveryCodes();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { totpEnabledAt: new Date(), totpLastStep: BigInt(step) },
      });
      await tx.recoveryCode.deleteMany({ where: { userId } });
      await tx.recoveryCode.createMany({
        data: codes.map((c) => ({ userId, codeHash: hashRecoveryCode(c) })),
      });
      // Anyone already signed in elsewhere signed in without the second
      // factor; end those sessions now that it is required.
      await tx.session.deleteMany({
        where: { userId, id: { not: sessionId } },
      });
      await this.audit.record(
        'auth.totp_enabled',
        { actorUserId: userId, entityType: 'user', entityId: userId },
        tx,
      );
    });
    return { recoveryCodes: codes };
  }

  /** Turns two-factor off. Needs the password AND a current second factor. */
  async disable(userId: string, password: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true, totpEnabledAt: true },
    });
    if (!user.totpEnabledAt) {
      throw new BadRequestException('Two-factor is not on.');
    }
    if (!(await verifyPassword(user.passwordHash, password))) {
      throw new UnauthorizedException('Your password is not correct.');
    }
    if (!(await this.verifySecondFactor(userId, code))) {
      throw new UnauthorizedException('That code is not right.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { totpSecret: null, totpEnabledAt: null, totpLastStep: null },
      });
      await tx.recoveryCode.deleteMany({ where: { userId } });
      await this.audit.record(
        'auth.totp_disabled',
        { actorUserId: userId, entityType: 'user', entityId: userId },
        tx,
      );
    });
  }

  /**
   * Checks a TOTP code (consuming its time step) or a recovery code
   * (consuming the code). True when accepted.
   */
  async verifySecondFactor(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { totpSecret: true, totpLastStep: true },
    });
    if (!user.totpSecret) return false;

    const digits = code.replace(/\s/g, '');
    if (/^\d{6}$/.test(digits)) {
      const step = verifyTotp(
        this.decrypt(user.totpSecret),
        digits,
        user.totpLastStep,
      );
      if (step === null) return false;
      // Conditional update: two requests racing with the same code cannot
      // both win — only one can move last_step past this step.
      const { count } = await this.prisma.user.updateMany({
        where: {
          id: userId,
          OR: [{ totpLastStep: null }, { totpLastStep: { lt: BigInt(step) } }],
        },
        data: { totpLastStep: BigInt(step) },
      });
      return count === 1;
    }

    if (looksLikeRecoveryCode(code)) {
      const { count } = await this.prisma.recoveryCode.updateMany({
        where: { userId, codeHash: hashRecoveryCode(code), usedAt: null },
        data: { usedAt: new Date() },
      });
      if (count === 1) {
        await this.audit.record('auth.recovery_code_used', {
          actorUserId: userId,
          entityType: 'user',
          entityId: userId,
        });
        return true;
      }
    }
    return false;
  }

  async remainingRecoveryCodes(userId: string, db: Db = this.prisma) {
    return db.recoveryCode.count({ where: { userId, usedAt: null } });
  }

  private decrypt(sealed: string): string {
    return open(sealed, this.env.totpEncryptionKey);
  }
}
