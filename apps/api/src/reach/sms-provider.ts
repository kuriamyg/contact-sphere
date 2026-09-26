import type { SmsConfig } from '../config/env';

export interface SmsResult {
  /** Numbers the provider accepted for delivery. */
  accepted: number;
}

/** Sends one text to many numbers (E.164, Kenyan mobiles). */
export interface SmsProvider {
  readonly name: string;
  send(to: string[], message: string): Promise<SmsResult>;
}

/** Records instead of sending. Tests and local development only. */
export class LogSmsProvider implements SmsProvider {
  readonly name = 'log';
  readonly sent: { to: string[]; message: string }[] = [];
  send(to: string[], message: string): Promise<SmsResult> {
    this.sent.push({ to, message });
    return Promise.resolve({ accepted: to.length });
  }
}

/** The bulk API accepts at most this many messages per request. */
export const PARTNER_BATCH = 20;

interface PartnerResponse {
  responses?: {
    'response-code'?: number | string;
    'respose-code'?: number | string;
  }[];
}

/**
 * The partnerID / apikey / shortcode "sendbulk" API that several Kenyan
 * aggregators run (Celcom Africa, Advanta, TextSMS): POST {count, smslist}
 * to <base>sendbulk/. Code 200 per message = accepted.
 */
export class PartnerSmsProvider implements SmsProvider {
  readonly name = 'partner';
  constructor(
    private readonly cfg: SmsConfig,
    private readonly http: typeof fetch = fetch,
  ) {}

  async send(to: string[], message: string): Promise<SmsResult> {
    let accepted = 0;
    for (let i = 0; i < to.length; i += PARTNER_BATCH) {
      const batch = to.slice(i, i + PARTNER_BATCH);
      const smslist = batch.map((mobile, j) => ({
        partnerID: this.cfg.partnerId,
        apikey: this.cfg.apiKey,
        pass_type: 'plain',
        clientsmsid: i + j + 1,
        // These APIs take 2547XXXXXXXX, without the plus.
        mobile: mobile.replace(/^\+/, ''),
        message,
        shortcode: this.cfg.senderId,
      }));
      try {
        const res = await this.http(`${this.cfg.url}sendbulk/`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ count: smslist.length, smslist }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) continue;
        const body = (await res.json()) as PartnerResponse;
        accepted += (body.responses ?? []).filter(
          (r) => Number(r['response-code'] ?? r['respose-code']) === 200,
        ).length;
      } catch {
        // A failed batch is counted as not accepted; the rest still go.
      }
    }
    return { accepted: Math.min(accepted, to.length) };
  }
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

export function smsProviderFor(cfg: SmsConfig | undefined): SmsProvider | null {
  if (!cfg) return null;
  return cfg.provider === 'log'
    ? new LogSmsProvider()
    : new PartnerSmsProvider(cfg);
}
