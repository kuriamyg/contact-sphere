/**
 * "Chrome on Android" from a browser's User-Agent, for the list of signed-in
 * devices (A5). Deliberately coarse: no versions, no device model, and the
 * full string is never stored — enough to recognise your own phone, too
 * little to fingerprint anyone. Unknown → null.
 */
export function deviceLabel(ua: string | undefined): string | null {
  if (!ua) return null;
  const s = ua.slice(0, 512);
  const browser = /EdgA?\//.test(s)
    ? 'Edge'
    : /OPR\/|Opera/.test(s)
      ? 'Opera'
      : /SamsungBrowser\//.test(s)
        ? 'Samsung Internet'
        : /Firefox\/|FxiOS\//.test(s)
          ? 'Firefox'
          : /Chrome\/|CriOS\//.test(s)
            ? 'Chrome'
            : /Safari\//.test(s) && /Version\//.test(s)
              ? 'Safari'
              : null;
  const os = /iPhone/.test(s)
    ? 'iPhone'
    : /iPad/.test(s)
      ? 'iPad'
      : /Android/.test(s)
        ? 'Android'
        : /CrOS/.test(s)
          ? 'ChromeOS'
          : /Windows/.test(s)
            ? 'Windows'
            : /Mac OS X|Macintosh/.test(s)
              ? 'Mac'
              : /Linux/.test(s)
                ? 'Linux'
                : null;
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os;
}
