/**
 * Safaricom's M-Pesa prompt result (B9, ADR 0019). Safaricom posts here;
 * this forwards the body to the API with the web-server secret, like every
 * other call (ADR 0006). The API checks the token in the path, the checkout
 * id and the amount. Holds no data, and always answers "accepted" so
 * Safaricom does not retry forever; a lost result is recovered by the
 * status check on the Plan page.
 */
export const dynamic = 'force-dynamic';

const TOKEN = /^[A-Za-z0-9_-]{32,128}$/;
const ACCEPTED = { ResultCode: 0, ResultDesc: 'Accepted' };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  if (!TOKEN.test(token)) return new Response('Not found', { status: 404 });
  const base = process.env.API_URL?.replace(/\/+$/, '');
  const secret = process.env.API_SHARED_SECRET;
  if (!base || !secret) return new Response('Not configured', { status: 500 });
  const text = await request.text();
  if (text.length > 20_000) return Response.json(ACCEPTED);
  try {
    const res = await fetch(`${base}/billing/mpesa/callback/${token}`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'x-bff-secret': secret,
        'x-client-ip': '127.0.0.1',
        'content-type': 'application/json',
      },
      body: text,
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 404) return new Response('Not found', { status: 404 });
  } catch {
    // Accepted anyway: the Plan page asks M-Pesa directly.
  }
  return Response.json(ACCEPTED);
}
