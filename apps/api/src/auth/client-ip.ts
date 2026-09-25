import type { Request } from 'express';

import { CLIENT_IP_HEADER } from './auth.constants';

/**
 * The real client's address, for rate limiting.
 *
 * Every request reaches us from the web app's SERVER, so the socket address
 * is Vercel's, shared by everyone. The web server forwards the browser's
 * address in X-Client-IP. That header is only believed because BffGuard has
 * already proven the request came from our web server; a stranger calling the
 * API directly never gets this far.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers[CLIENT_IP_HEADER];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (value && value.length <= 64 && /^[0-9a-fA-F.:]+$/.test(value)) {
    return value;
  }
  return req.ip ?? 'unknown';
}
