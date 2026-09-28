import { randomBytes } from 'node:crypto';

import type { MpesaConfig } from '../config/env';

export interface StkRequest {
  /** E.164 without the plus: 2547XXXXXXXX. */
  phone: string;
  amountKes: number;
  /** Shown on the prompt as the account (≤ 12 characters). */
  reference: string;
  callbackUrl: string;
}

export type StkStart =
  { ok: true; checkoutId: string } | { ok: false; reason: string };

export type StkState =
  | { state: 'paid' }
  | { state: 'failed'; resultDesc: string }
  | { state: 'pending' };

/** The M-Pesa prompt on the customer's phone (Lipa na M-Pesa Online). */
export interface MpesaClient {
  readonly name: string;
  stkPush(req: StkRequest): Promise<StkStart>;
  /** Asks Safaricom how a prompt ended, for when the callback is lost. */
  query(checkoutId: string): Promise<StkState>;
}

export const MPESA = Symbol('MPESA');

/** Records prompts instead of sending them. Tests and local only. */
export class LogMpesa implements MpesaClient {
  readonly name = 'log';
  readonly pushed: (StkRequest & { checkoutId: string })[] = [];
  /** What `query` answers, per checkout id; pending when unset. */
  readonly outcomes = new Map<string, StkState>();
  stkPush(req: StkRequest): Promise<StkStart> {
    const checkoutId = `ws_CO_log_${randomBytes(8).toString('hex')}`;
    this.pushed.push({ ...req, checkoutId });
    return Promise.resolve({ ok: true, checkoutId });
  }
  query(checkoutId: string): Promise<StkState> {
    return Promise.resolve(
      this.outcomes.get(checkoutId) ?? { state: 'pending' },
    );
  }
}

const TIMEOUT_MS = 15_000;

/** "20260928193000" in Nairobi time, as Daraja expects. */
export function darajaTimestamp(now = new Date()): string {
  const eat = new Date(now.getTime() + 3 * 3600_000);
  return eat.toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

/**
 * Safaricom Daraja: OAuth client credentials, then STK push and STK query
 * (ADR 0019). The password is base64(shortcode + passkey + timestamp).
 */
export class DarajaMpesa implements MpesaClient {
  readonly name = 'daraja';
  private token?: { value: string; until: number };

  constructor(
    private readonly cfg: MpesaConfig,
    private readonly http: typeof fetch = fetch,
  ) {}

  get base(): string {
    return this.cfg.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private async accessToken(): Promise<string | null> {
    if (this.token && this.token.until > Date.now()) return this.token.value;
    const basic = Buffer.from(
      `${this.cfg.consumerKey ?? ''}:${this.cfg.consumerSecret ?? ''}`,
    ).toString('base64');
    const res = await this.http(
      `${this.base}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: { authorization: `Basic ${basic}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      access_token?: string;
      expires_in?: string | number;
    };
    if (!body.access_token) return null;
    const seconds = Number(body.expires_in ?? 3599);
    this.token = {
      value: body.access_token,
      until: Date.now() + Math.max(60, seconds - 60) * 1000,
    };
    return body.access_token;
  }

  private password(timestamp: string): string {
    return Buffer.from(
      `${this.cfg.shortcode}${this.cfg.passkey ?? ''}${timestamp}`,
    ).toString('base64');
  }

  private async post(
    path: string,
    body: Record<string, unknown>,
  ): Promise<{ ok: boolean; json: Record<string, unknown> }> {
    const token = await this.accessToken();
    if (!token) return { ok: false, json: {} };
    const res = await this.http(`${this.base}${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    return { ok: res.ok, json };
  }

  async stkPush(req: StkRequest): Promise<StkStart> {
    const timestamp = darajaTimestamp();
    try {
      const { ok, json } = await this.post('/mpesa/stkpush/v1/processrequest', {
        BusinessShortCode: this.cfg.shortcode,
        Password: this.password(timestamp),
        Timestamp: timestamp,
        TransactionType:
          this.cfg.type === 'till'
            ? 'CustomerBuyGoodsOnline'
            : 'CustomerPayBillOnline',
        Amount: req.amountKes,
        PartyA: req.phone,
        PartyB: this.cfg.partyB,
        PhoneNumber: req.phone,
        CallBackURL: req.callbackUrl,
        AccountReference: req.reference.slice(0, 12),
        TransactionDesc: 'Plus',
      });
      const checkoutId = json.CheckoutRequestID;
      if (ok && json.ResponseCode === '0' && typeof checkoutId === 'string') {
        return { ok: true, checkoutId };
      }
      const said = json.errorMessage ?? json.ResponseDescription;
      return {
        ok: false,
        reason: typeof said === 'string' ? said.slice(0, 200) : 'refused',
      };
    } catch {
      return { ok: false, reason: 'unreachable' };
    }
  }

  async query(checkoutId: string): Promise<StkState> {
    const timestamp = darajaTimestamp();
    try {
      const { ok, json } = await this.post('/mpesa/stkpushquery/v1/query', {
        BusinessShortCode: this.cfg.shortcode,
        Password: this.password(timestamp),
        Timestamp: timestamp,
        CheckoutRequestID: checkoutId,
      });
      // "The transaction is being processed" comes back as an error.
      if (!ok || json.ResponseCode !== '0') return { state: 'pending' };
      if (String(json.ResultCode) === '0') return { state: 'paid' };
      const desc = json.ResultDesc;
      return {
        state: 'failed',
        resultDesc:
          typeof desc === 'string' ? desc.slice(0, 200) : 'Not completed',
      };
    } catch {
      return { state: 'pending' };
    }
  }
}

export function mpesaFor(cfg: MpesaConfig | undefined): MpesaClient | null {
  if (!cfg) return null;
  return cfg.provider === 'log' ? new LogMpesa() : new DarajaMpesa(cfg);
}

/** What Safaricom posts to the callback URL when a prompt ends. */
export interface StkCallback {
  checkoutId: string;
  resultCode: number;
  resultDesc: string;
  amount?: number;
  receipt?: string;
}

/** Reads Body.stkCallback defensively; null when it is not one. */
export function parseStkCallback(body: unknown): StkCallback | null {
  const cb = (body as { Body?: { stkCallback?: Record<string, unknown> } })
    ?.Body?.stkCallback;
  if (!cb || typeof cb.CheckoutRequestID !== 'string') return null;
  const resultCode = Number(cb.ResultCode);
  if (!Number.isInteger(resultCode)) return null;
  const items =
    (cb.CallbackMetadata as { Item?: { Name?: string; Value?: unknown }[] })
      ?.Item ?? [];
  const value = (name: string) => items.find((i) => i.Name === name)?.Value;
  const amount = Number(value('Amount'));
  const receipt = value('MpesaReceiptNumber');
  return {
    checkoutId: cb.CheckoutRequestID,
    resultCode,
    resultDesc:
      typeof cb.ResultDesc === 'string'
        ? cb.ResultDesc.slice(0, 200)
        : 'Not completed',
    amount: Number.isFinite(amount) ? amount : undefined,
    receipt: typeof receipt === 'string' ? receipt : undefined,
  };
}
