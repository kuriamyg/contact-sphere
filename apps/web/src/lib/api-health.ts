/**
 * Asks the API whether it is alive, from the Next.js server.
 *
 * Runs server-side on purpose: the browser never learns the API's address
 * from this page, and no CORS round-trip is needed just to show a status.
 */

export type ApiHealth = 'online' | 'offline' | 'not-configured';

/**
 * Render's free plan sleeps after 15 idle minutes and takes up to a minute to
 * wake. A status page must not hang for that long, so it gives up quickly and
 * says "offline" — which, on the free plan, often means "waking up".
 */
export const HEALTH_TIMEOUT_MS = 5_000;

export async function checkApiHealth(
  baseUrl: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiHealth> {
  const base = baseUrl?.trim().replace(/\/+$/, '');
  if (!base) return 'not-configured';

  try {
    const res = await fetchImpl(`${base}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    if (!res.ok) return 'offline';
    const body: unknown = await res.json();
    return isOk(body) ? 'online' : 'offline';
  } catch {
    // Network error, timeout, or a non-JSON body: all mean "not usable now".
    return 'offline';
  }
}

function isOk(body: unknown): boolean {
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as { status?: unknown }).status === 'ok'
  );
}
