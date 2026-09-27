/**
 * A polished chrome ring: a metallic torus whose highlight sweeps around as
 * it turns. Used as the sign-in pages' emblem and as their spinner.
 * Decorative: whatever it marks is always said in words too.
 * `id` keeps the gradient ids unique when two rings share a page.
 */
export function ChromeRing({
  id,
  className = 'size-5',
  spin = 'fast',
}: {
  id: string;
  className?: string;
  spin?: 'fast' | 'slow' | 'none';
}) {
  const band = `${id}-band`;
  const rim = `${id}-rim`;
  const motion =
    spin === 'fast'
      ? 'animate-spin'
      : spin === 'slow'
        ? 'animate-[spin_9s_linear_infinite]'
        : '';
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      fill="none"
      className={`${className} ${motion}`}
    >
      <defs>
        <linearGradient id={band} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.22" stopColor="#a3a3a3" />
          <stop offset="0.45" stopColor="#1f1f1f" />
          <stop offset="0.62" stopColor="#e5e5e5" />
          <stop offset="0.8" stopColor="#5c5c5c" />
          <stop offset="1" stopColor="#f5f5f5" />
        </linearGradient>
        <linearGradient id={rim} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <circle
        cx="50"
        cy="50"
        r="30"
        stroke={`url(#${band})`}
        strokeWidth="14"
      />
      <circle
        cx="50"
        cy="50"
        r="37.5"
        stroke={`url(#${rim})`}
        strokeWidth="1.2"
      />
      <circle
        cx="50"
        cy="50"
        r="22.5"
        stroke={`url(#${rim})`}
        strokeWidth="1.2"
      />
    </svg>
  );
}
