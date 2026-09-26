/**
 * The owner's colour theme: follow the phone (auto), or always light or
 * dark. Kept in a plain cookie so the server renders the right theme with
 * no flash; it is a display preference, not a secret.
 */
export const THEMES = ['auto', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = 'cs-theme';

export function parseTheme(value: string | undefined | null): Theme {
  return (THEMES as readonly string[]).includes(value ?? '')
    ? (value as Theme)
    : 'auto';
}

/** In the browser: switch now and remember it on this device for a year. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}
