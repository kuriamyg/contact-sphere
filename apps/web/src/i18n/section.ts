/**
 * One area's strings in both languages, side by side, so a translation is
 * always next to its source. `sw` must have exactly the shape of `en`.
 */
export function section<T>(en: T, sw: NoInfer<T>): { en: T; sw: T } {
  return { en, sw };
}
