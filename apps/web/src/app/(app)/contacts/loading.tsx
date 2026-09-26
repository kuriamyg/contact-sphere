/** Shown while the list loads (Render's free API can take a moment to wake). */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <p className="sr-only" role="status">
        Loading contacts…
      </p>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-surface" />
      <div className="h-11 animate-pulse rounded-lg bg-surface" />
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-surface" />
        ))}
      </div>
    </div>
  );
}
