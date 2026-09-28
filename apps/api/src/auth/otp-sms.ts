import { Logger } from '@nestjs/common';

import type { OtpSmsConfig } from '../config/env';

/** Sends one text. Resolves false instead of throwing. */
export interface OtpSms {
  readonly name: string;
  send(to: string, text: string): Promise<boolean>;
}

export const OTP_SMS = Symbol('OTP_SMS');

/**
 * Records and logs instead of sending, so a developer can read the code.
 * Tests and local development only: the config refuses it in production.
 */
export class LogOtpSms implements OtpSms {
  readonly name = 'log';
  readonly sent: { to: string; text: string }[] = [];
  private readonly logger = new Logger('OtpSms');
  send(to: string, text: string): Promise<boolean> {
    this.sent.push({ to, text });
    this.logger.log(`SMS (not sent) to ${to}: ${text}`);
    return Promise.resolve(true);
  }
}

const TIMEOUT_MS = 10_000;

/**
 * Africa's Talking SMS (B6). POST form data to /version1/messaging with an
 * apiKey header. The username "sandbox" goes to their sandbox, where texts
 * appear in the online simulator instead of on real phones. Accepted when
 * the recipient's statusCode is 100–102 (processed, sent, queued).
 */
export class AfricasTalkingOtpSms implements OtpSms {
  readonly name = 'africastalking';
  constructor(
    private readonly cfg: OtpSmsConfig,
    private readonly http: typeof fetch = fetch,
  ) {}

  get url(): string {
    return this.cfg.username === 'sandbox'
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging';
  }

  async send(to: string, text: string): Promise<boolean> {
    const form = new URLSearchParams({
      username: this.cfg.username ?? '',
      to,
      message: text,
    });
    if (this.cfg.senderId) form.set('from', this.cfg.senderId);
    try {
      const res = await this.http(this.url, {
        method: 'POST',
        headers: {
          apiKey: this.cfg.apiKey ?? '',
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) return false;
      const body = (await res.json()) as {
        SMSMessageData?: { Recipients?: { statusCode?: number }[] };
      };
      const code = body.SMSMessageData?.Recipients?.[0]?.statusCode;
      return typeof code === 'number' && code >= 100 && code <= 102;
    } catch {
      return false;
    }
  }
}

export function otpSmsFor(cfg: OtpSmsConfig | undefined): OtpSms | null {
  if (!cfg) return null;
  return cfg.provider === 'log'
    ? new LogOtpSms()
    : new AfricasTalkingOtpSms(cfg);
}
