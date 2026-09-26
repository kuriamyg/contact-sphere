import { api, sessionToken } from '@/lib/api';

/**
 * The owner's offline copy, for this device's own store (Phase 10b).
 * JSON only; 401 tells the device to wipe its copy.
 */
export async function GET(req: Request): Promise<Response> {
  const headers = { 'cache-control': 'no-store' };
  if (!(await sessionToken())) {
    return Response.json({ error: 'signed out' }, { status: 401, headers });
  }
  const res = await api<unknown>('/sync/snapshot');
  if (res.status === 401) {
    return Response.json({ error: 'signed out' }, { status: 401, headers });
  }
  if (res.status !== 200 || !res.data) {
    return Response.json({ error: 'unavailable' }, { status: 503, headers });
  }
  // Most checks find nothing new: answer those with a tiny 304, so keeping
  // the copy fresh costs almost no data. `generatedAt` changes every time,
  // so it is left out of the fingerprint.
  const content: Record<string, unknown> = { ...(res.data as object) };
  delete content.generatedAt;
  delete content.today;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(content)),
  );
  const etag = `"${Buffer.from(digest).toString('base64url')}"`;
  if (req.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { ...headers, etag } });
  }
  return Response.json(res.data, { headers: { ...headers, etag } });
}
