import type { EmailConfig } from '../config/env';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Sends one email. Resolves false instead of throwing: a reminder is best effort. */
export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<boolean>;
}

/** Records instead of sending. Tests and local development only. */
export class LogEmailProvider implements EmailProvider {
  readonly name = 'log';
  readonly sent: EmailMessage[] = [];
  send(msg: EmailMessage): Promise<boolean> {
    this.sent.push(msg);
    return Promise.resolve(true);
  }
}

const TIMEOUT_MS = 10_000;

/** Resend (resend.com): POST /emails with a bearer key; 200 = accepted. */
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  constructor(
    private readonly cfg: EmailConfig,
    private readonly http: typeof fetch = fetch,
  ) {}

  async send(msg: EmailMessage): Promise<boolean> {
    try {
      const res = await this.http('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.cfg.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.cfg.from.name} <${this.cfg.from.address}>`,
          to: [msg.to],
          subject: msg.subject,
          text: msg.text,
          html: msg.html,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

/** Brevo (brevo.com): POST /v3/smtp/email with an api-key header; 201 = accepted. */
export class BrevoEmailProvider implements EmailProvider {
  readonly name = 'brevo';
  constructor(
    private readonly cfg: EmailConfig,
    private readonly http: typeof fetch = fetch,
  ) {}

  async send(msg: EmailMessage): Promise<boolean> {
    try {
      const res = await this.http('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.cfg.apiKey ?? '',
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: this.cfg.from.name, email: this.cfg.from.address },
          to: [{ email: msg.to }],
          subject: msg.subject,
          textContent: msg.text,
          htmlContent: msg.html,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

export function emailProviderFor(
  cfg: EmailConfig | undefined,
): EmailProvider | null {
  if (!cfg) return null;
  if (cfg.provider === 'log') return new LogEmailProvider();
  return cfg.provider === 'resend'
    ? new ResendEmailProvider(cfg)
    : new BrevoEmailProvider(cfg);
}
