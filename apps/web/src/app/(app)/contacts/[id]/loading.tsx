/**
 * Also a prefetch boundary: prefetching a contact renders only this, so
 * merely seeing a link never counts as opening the contact (ADR 0007).
 */
export default function Loading() {
  return (
    <div className="max-w-xl space-y-4" aria-busy="true">
      <p className="sr-only" role="status">
        Loading contact…
      </p>
      <div className="h-8 w-56 animate-pulse rounded-lg bg-surface" />
      <div className="h-24 animate-pulse rounded-lg bg-surface" />
    </div>
  );
}
