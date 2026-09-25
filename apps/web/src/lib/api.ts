import 'server-only';

import { cookies, headers } from 'next/headers';

import { sessionCookieName } from './session-cookie';

/**
 * The only way the web app talks to the API: from this server, never the
 * browser (ADR 0006). Every call carries the shared secret, the browser's
 * real IP (for rate limiting), and — when signed in — the session token
 * read from the HttpOnly cookie.
 */
export interface ApiResult<T> {
  status: number;
  data: T | null;
  /** The API's user-facing message, when it sent one. */
  message?: string;
}

const PRODUCTION = process.env.NODE_ENV === 'production';

export function isProduction(): boolean {
  return PRODUCTION;
}

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(sessionCookieName(PRODUCTION))?.value;
}

/** The browser's address as Vercel reports it; never trusted from the page. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const real = h.get('x-real-ip');
  if (real) return real;
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || '127.0.0.1';
}

export function buildApiHeaders(opts: {
  secret: string;
  ip: string;
  token?: string;
  json: boolean;
}): Record<string, string> {
  const h: Record<string, string> = {
    'x-bff-secret': opts.secret,
    'x-client-ip': opts.ip,
    accept: 'application/json',
  };
  if (opts.json) h['content-type'] = 'application/json';
  if (opts.token) h.authorization = `Session ${opts.token}`;
  return h;
}

export async function api<T>(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown; auth?: boolean } = {},
): Promise<ApiResult<T>> {
  const base = process.env.API_URL?.replace(/\/+$/, '');
  const secret = process.env.API_SHARED_SECRET;
  if (!base || !secret) {
    throw new Error(
      'API_URL and API_SHARED_SECRET must be set on the web server.',
    );
  }
  const res = await fetch(`${base}${path}`, {
    method: init.method ?? 'GET',
    cache: 'no-store',
    headers: buildApiHeaders({
      secret,
      ip: await clientIp(),
      token: init.auth === false ? undefined : await sessionToken(),
      json: init.body !== undefined,
    }),
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    // Render's free instance can take ~60 s to wake up.
    signal: AbortSignal.timeout(65_000),
  });
  if (res.status === 204) return { status: 204, data: null };
  const body: unknown = await res.json().catch(() => null);
  if (res.ok) return { status: res.status, data: body as T };
  return { status: res.status, data: null, message: apiMessage(body) };
}

function apiMessage(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const m = (body as { message?: unknown }).message;
  if (typeof m === 'string') return m;
  // Validation errors arrive as a list; show the first, plainly.
  if (Array.isArray(m) && typeof m[0] === 'string') return m[0];
  return undefined;
}
