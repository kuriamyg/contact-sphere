import { randomInt } from 'node:crypto';

import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import type { Env } from '../config/env';
import { ENV } from '../config/env.provider';
import { PrismaService } from '../prisma/prisma.service';
import { kenyanMobile } from './mobile';
import { OTP_SMS, type OtpSms } from './otp-sms';
import { hashToken, secretsEqual } from './tokens';

export type CodePurpose = 'signup' | 'reset';

/** A code works for 10 minutes and 5 tries. */
export const CODE_TTL_MS = 10 * 60 * 1000;
export const CODE_MAX_ATTEMPTS = 5;
/** One code a minute, five a day, per number and purpose. */
export const CODE_COOLDOWN_MS = 60 * 1000;
export const CODES_PER_DAY = 5;

const NOT_A_MOBILE = 'Enter a Kenyan mobile number, like 0712 345 678.';
const CODE_EXPIRED = 'That code has expired. Ask for a new one.';
const CODE_WRONG = 'That code is not right.';
const LINE_BLOCKS_SMS =
  'Your line is blocking messages from companies (Do Not Disturb), so the code could not be delivered. Allow promotional messages on your line, or use another number.';

const TEXT = {
  en: {
    code: (c: string) =>
      `Your Contact Sphere verification code is ${c}. It expires in 10 minutes. Do not share it with anyone.`,
    exists:
      'This number already has a Contact Sphere account. Sign in, or reset your password if you forgot it.',
  },
  sw: {
    code: (c: string) =>
      `Msimbo wako wa uthibitisho wa Contact Sphere ni ${c}. Unaisha baada ya dakika 10. Usimpe mtu yeyote.`,
    exists:
      'Nambari hii tayari ina akaunti ya Contact Sphere. Ingia, au weka upya nenosiri ikiwa umelisahau.',
  },
};

/**
 * One-time SMS codes that prove a phone number (B6, ADR 0018), for sign-up
 * and password reset. Only a hash of each code is stored. Asking for a code
 * answers the same way whether or not the number has an account, so the
 * endpoint cannot be used to find out who uses Contact Sphere; the text
 * itself says which case applies, to the phone's owner only.
 */
@Injectable()
export class PhoneCodes {
  private readonly logger = new Logger('PhoneCodes');
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(OTP_SMS) private readonly sms: OtpSms | null,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /**
   * The last line of a code SMS in the WebOTP / Android SMS format
   * ("@host #code"), so Chrome on Android can offer to fill the code in
   * by itself — only on our own site.
   */
  private otpLine(code: string): string {
    const origin = this.env.webOrigins[0];
    if (!origin) return '';
    try {
      return `\n\n@${new URL(origin).host} #${code}`;
    } catch {
      return '';
    }
  }

  get enabled(): boolean {
    return this.sms !== null;
  }

  /** "0712 345 678" → "+254712345678", or 400. */
  mobile(input: string): string {
    const phone = kenyanMobile(input);
    if (!phone) throw new BadRequestException(NOT_A_MOBILE);
    return phone;
  }

  async send(
    purpose: CodePurpose,
    input: string,
    locale: 'en' | 'sw' = 'en',
  ): Promise<void> {
    if (!this.sms) throw new ServiceUnavailableException();
    const phone = this.mobile(input);
    const now = Date.now();
    await this.prune();

    const recent = await this.prisma.phoneCode.findMany({
      where: {
        phone,
        purpose,
        createdAt: { gt: new Date(now - 24 * 60 * 60 * 1000) },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    if (recent.length >= CODES_PER_DAY) {
      throw new HttpException(
        'Too many codes for this number today. Try again tomorrow.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (recent[0] && now - recent[0].createdAt.getTime() < CODE_COOLDOWN_MS) {
      throw new HttpException(
        'Wait a minute before asking for another code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const account = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    // A row even when no code is texted, so the limits above also stop
    // someone texting a stranger again and again.
    const row = await this.prisma.phoneCode.create({
      data: {
        phone,
        purpose,
        codeHash: '0'.repeat(64),
        expiresAt: new Date(now + CODE_TTL_MS),
      },
      select: { id: true },
    });
    await this.prisma.phoneCode.update({
      where: { id: row.id },
      data: { codeHash: hashToken(`${row.id}:${code}`) },
    });

    const t = TEXT[locale];
    let text: string | null;
    const withCode = t.code(code) + this.otpLine(code);
    if (purpose === 'signup') text = account ? t.exists : withCode;
    else text = account ? withCode : null; // reset: nothing for strangers

    if (text) {
      const sent = await this.sms.send(phone, text);
      if (!sent.ok) {
        await this.prisma.phoneCode.delete({ where: { id: row.id } });
        // The provider's reason, never the number: the next failure is
        // diagnosable from the logs alone.
        this.logger.warn(`SMS code not sent: ${sent.reason}`);
        if (sent.blocked) {
          throw new UnprocessableEntityException(LINE_BLOCKS_SMS);
        }
        throw new ServiceUnavailableException(
          'Could not send the code just now. Try again in a minute.',
        );
      }
    }
    await this.audit.record('auth.phone_code_sent', {
      metadata: { purpose, texted: text !== null },
    });
  }

  /**
   * Checks the newest live code for the number. Right: all its codes for
   * this purpose are used up. Wrong: one of five attempts is spent.
   */
  async verify(
    purpose: CodePurpose,
    phone: string,
    code: string,
  ): Promise<void> {
    const row = await this.prisma.phoneCode.findFirst({
      where: { phone, purpose, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, codeHash: true, attempts: true },
    });
    if (!row || row.attempts >= CODE_MAX_ATTEMPTS) {
      throw new BadRequestException(CODE_EXPIRED);
    }
    const digits = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(digits)) throw new BadRequestException(CODE_WRONG);
    if (!secretsEqual(hashToken(`${row.id}:${digits}`), row.codeHash)) {
      await this.prisma.phoneCode.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException(CODE_WRONG);
    }
    await this.prisma.phoneCode.deleteMany({ where: { phone, purpose } });
  }

  /** Old codes are useless; keep the table small. */
  async prune(): Promise<void> {
    await this.prisma.phoneCode.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
  }
}
