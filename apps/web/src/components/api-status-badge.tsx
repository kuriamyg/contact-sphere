import type { ApiHealth } from '@/lib/api-health';

const LABELS: Record<ApiHealth, { text: string; dot: string }> = {
  online: { text: 'Online', dot: 'bg-emerald-500' },
  offline: {
    text: 'Unreachable (may be waking up)',
    dot: 'bg-amber-500',
  },
  'not-configured': { text: 'Not configured', dot: 'bg-slate-400' },
};

/**
 * Status is always stated in words; the coloured dot is decoration only, so
 * the badge works for colour-blind users and screen readers alike.
 */
export function ApiStatusBadge({ status }: { status: ApiHealth }) {
  const { text, dot } = LABELS[status];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />
      {text}
    </span>
  );
}
