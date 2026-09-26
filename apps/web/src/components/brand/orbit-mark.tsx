/**
 * The Contact Sphere mark: a sphere with a ringed orbit (the app icon). Decorative.
 */
export function OrbitMark({ className = 'size-9' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-[30%] bg-[radial-gradient(circle_at_30%_25%,#1a1f3d,#05060c_70%)] shadow-[0_0_18px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.12)] ${className}`}
    >
      <svg viewBox="0 0 96 96" className="size-[78%]" fill="none">
        <circle cx="48" cy="48" r="20" fill="#10b981" />
        <circle cx="42" cy="42" r="7" fill="#6ee7b7" opacity="0.6" />
        <ellipse
          cx="48"
          cy="48"
          rx="38"
          ry="12"
          stroke="#c4b5fd"
          strokeWidth="4"
          transform="rotate(-24 48 48)"
        />
        <circle cx="84" cy="34" r="4.5" fill="#ffffff" />
      </svg>
    </span>
  );
}
