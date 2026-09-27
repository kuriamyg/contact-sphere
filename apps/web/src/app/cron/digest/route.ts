import { timingSafeEqual } from 'node:crypto';

/**
 * The morning reminder job (Phase 11). Vercel Cron calls this once a day
 * (vercel.json) with "Authorization: Bearer $CRON_SECRET"; anything else is
 * refused. It asks the API to send each owner's reminder (phone and, if chosen,
 * email). Holds no data.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorised(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32 || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request): Promise<Response> {
  if (!authorised(request.headers.get('authorization'))) {
    return new Response('Not found', { status: 404 });
  }
  const base = process.env.API_URL?.replace(/\/+$/, '');
  const secret = process.env.API_SHARED_SECRET;
  if (!base || !secret) return new Response('Not configured', { status: 500 });
  try {
    const res = await fetch(`${base}/reach/digest/run`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'x-bff-secret': secret,
        'x-client-ip': '127.0.0.1',
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(55_000),
    });
    const body = await res.text();
    return new Response(body, {
      status: res.ok ? 200 : 502,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return new Response('API unreachable', { status: 502 });
  }
}
