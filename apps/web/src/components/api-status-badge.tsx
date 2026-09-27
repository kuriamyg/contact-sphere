import { en, type Messages } from '@/i18n/en';
import type { ApiHealth } from '@/lib/api-health';

const DOTS: Record<ApiHealth, string> = {
  online: 'bg-emerald-500',
  offline: 'bg-amber-500',
  'not-configured': 'bg-slate-400',
};

const text = (status: ApiHealth, t: Messages['home']) =>
  status === 'online'
    ? t.online
    : status === 'offline'
      ? t.unreachable
      : t.notConfigured;

/**
 * Status is always stated in words; the coloured dot is decoration only, so
 * the badge works for colour-blind users and screen readers alike.
 */
export function ApiStatusBadge({
  status,
  t = en.home,
}: {
  status: ApiHealth;
  t?: Messages['home'];
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm">
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${DOTS[status]}`}
      />
      {text(status, t)}
    </span>
  );
}
