/**
 * Fills {name} placeholders. Dictionaries hold plain strings (they cross
 * from server to client components), so variable parts are placeholders.
 */
export function fmt(
  template: string,
  vars: Record<string, string | number> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole,
  );
}

/** "one" when n is 1, else "other"; both may use {n}. */
export function plural(
  n: number,
  forms: { one: string; other: string },
  vars: Record<string, string | number> = {},
): string {
  return fmt(n === 1 ? forms.one : forms.other, { n, ...vars });
}
