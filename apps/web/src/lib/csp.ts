/**
 * The web app's Content-Security-Policy (ADR 0006). Pure, so it is tested.
 *
 * Scripts run only if they carry this request's nonce ('strict-dynamic'
 * lets those scripts load the chunks they need). An injected <script> —
 * the payload of an XSS bug — has no nonce and is refused by the browser.
 */
/**
 * SHA-256 of exactly `display:none`. React's streaming renderer hides
 * not-yet-placed SVG content with `<svg style="display:none">`; this lets
 * that one style attribute through and nothing else ('unsafe-hashes' with a
 * hash never allows any other inline style, and never any script).
 */
export const DISPLAY_NONE_HASH =
  'sha256-aqNNdDLnnrDOnTNdkJpYlAxKVJtLt9CtFLklmInuUAE=';

export function buildCsp(nonce: string, dev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-hashes' '${DISPLAY_NONE_HASH}'`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
