/**
 * The contact list's URL parameters: parsed defensively (anything unknown
 * falls back to a default) and turned into the API's query string. Pure, so
 * it is unit-tested and safe to use on the server and the client.
 */
export const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'lastUsed-desc', label: 'Recently opened' },
  { value: 'created-desc', label: 'Newest saved' },
  { value: 'created-asc', label: 'Oldest saved' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];
export type View = 'active' | 'archived' | 'trash';

export interface ListParams {
  q: string;
  sort: SortValue;
  view: View;
  page: number;
}

export const PAGE_SIZE = 50;

const first = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? '';

export function parseListParams(
  sp: Record<string, string | string[] | undefined>,
): ListParams {
  const sort = first(sp.sort);
  const view = first(sp.view);
  const page = Number.parseInt(first(sp.page), 10);
  return {
    q: first(sp.q).trim().slice(0, 100),
    sort: SORT_OPTIONS.some((o) => o.value === sort)
      ? (sort as SortValue)
      : 'name-asc',
    view: view === 'archived' || view === 'trash' ? view : 'active',
    page: Number.isFinite(page) && page >= 1 && page <= 10_000 ? page : 1,
  };
}

export function toApiQuery(p: ListParams): string {
  const [sort, order] = p.sort.split('-');
  const qs = new URLSearchParams({
    sort,
    order,
    view: p.view,
    page: String(p.page),
    pageSize: String(PAGE_SIZE),
  });
  if (p.q) qs.set('q', p.q);
  return qs.toString();
}

/** A link to the list with some parameters changed; defaults are omitted. */
export function listHref(p: ListParams, change: Partial<ListParams> = {}) {
  const next = { ...p, ...change };
  const qs = new URLSearchParams();
  if (next.q) qs.set('q', next.q);
  if (next.sort !== 'name-asc') qs.set('sort', next.sort);
  if (next.view !== 'active') qs.set('view', next.view);
  if (next.page !== 1) qs.set('page', String(next.page));
  const s = qs.toString();
  return s ? `/contacts?${s}` : '/contacts';
}
