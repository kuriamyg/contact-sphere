import type { Metadata } from 'next';
import Link from 'next/link';

import { RelationshipMap } from '@/components/relationships/relationship-map';
import { fmt } from '@/i18n/format';
import { getMessages, pageTitle } from '@/i18n/server';
import type { MapData, MapLink } from '@/lib/map-layout';
import { getMap, roleFor, roleName } from '@/lib/relationships';

export const generateMetadata = (): Promise<Metadata> =>
  pageTitle('relationshipMap');

const button =
  'rounded-lg border border-border px-4 py-2.5 text-sm font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';

/**
 * The relationship map (P6b, ADR 0024): everyone within two links of one
 * person, as a picture and as a list. Plus only; adding links stays free.
 */
export default async function RelationshipMapPage({
  searchParams,
}: PageProps<'/contacts/map'>) {
  const sp = await searchParams;
  const focus = typeof sp.focus === 'string' ? sp.focus : undefined;
  const layout = sp.layout === 'family' ? 'family' : 'everyone';
  const [asked, m] = await Promise.all([getMap(focus), getMessages()]);
  // Someone deleted or never there: centre on the default person instead.
  const res = asked.kind === 'missing' && focus ? await getMap() : asked;
  const t = m.relationships;

  const header = (
    <>
      <Link href="/contacts" className="text-sm text-muted hover:underline">
        {t.suggestions.back}
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.map.title}</h1>
        <p className="text-muted">{t.map.lead}</p>
      </div>
    </>
  );

  if (res.kind === 'plus') {
    return (
      <div className="max-w-2xl space-y-6">
        {header}
        <section
          className="space-y-3 rounded-2xl card p-5"
          data-testid="map-plus"
        >
          <h2 className="font-semibold">{t.map.plusTitle}</h2>
          <p className="text-sm text-muted">{t.map.plusBody}</p>
          <Link
            href="/account#plan-heading"
            className="inline-block rounded-lg btn-primary px-4 py-2.5 text-sm font-medium"
          >
            {t.map.plusCta}
          </Link>
        </section>
      </div>
    );
  }

  const data = res.kind === 'ok' ? res.data : null;
  if (!data?.focusId || data.people.length === 0) {
    return (
      <div className="max-w-2xl space-y-6">
        {header}
        <section className="space-y-3 rounded-2xl card p-5">
          <h2 className="font-semibold">{t.map.emptyTitle}</h2>
          <p className="text-sm text-muted">{t.map.emptyBody}</p>
          <Link href="/contacts/links" className={button}>
            {t.section.suggestions}
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {header}
      {data.truncated && (
        <p className="text-sm text-muted">{t.map.truncated}</p>
      )}
      <RelationshipMap
        key={data.focusId}
        data={data}
        initialLayout={layout}
        t={t}
      />
      <MapList data={data} t={t} />
    </div>
  );
}

/** The same people as the map, as a list: direct links, then through whom. */
function MapList({
  data,
  t,
}: {
  data: MapData;
  t: Awaited<ReturnType<typeof getMessages>>['relationships'];
}) {
  const focusId = data.focusId!;
  const name = new Map(data.people.map((p) => [p.id, p.displayName]));
  const depth = new Map(data.people.map((p) => [p.id, p.depth]));
  const role = (l: MapLink, of: string) => {
    const other = l.fromId === of ? l.toId : l.fromId;
    return {
      other,
      text: roleName(
        roleFor(l.kind, l.fromId === other),
        name.get(of) ?? '',
        t.roles,
      ),
    };
  };
  const touching = (id: string) =>
    data.links.filter((l) => l.fromId === id || l.toId === id);

  const direct = touching(focusId).map((l) => ({ ...role(l, focusId), l }));
  const through = direct
    .map((d) => d.other)
    .filter((id, i, all) => all.indexOf(id) === i)
    .map((via) => ({
      via,
      people: touching(via)
        .map((l) => ({ ...role(l, via), l }))
        .filter((x) => depth.get(x.other) === 2),
    }))
    .filter((g) => g.people.length > 0);

  const row = (id: string, text: string, label: string | null, key: string) => (
    <li key={key}>
      <Link
        href={`/contacts/${id}`}
        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-hover"
      >
        <span className="min-w-0 truncate">{name.get(id)}</span>
        <span className="shrink-0 text-sm text-muted">
          {text}
          {label && ` · ${label}`}
        </span>
      </Link>
    </li>
  );

  return (
    <section aria-labelledby="map-list" className="space-y-4">
      <h2 id="map-list" className="text-sm font-semibold text-muted uppercase">
        {t.map.listTitle}
      </h2>
      <div className="space-y-2">
        <h3 className="font-medium">{name.get(focusId)}</h3>
        <ul className="divide-y divide-border rounded-xl card">
          {direct.map((d) => row(d.other, d.text, d.l.label, d.l.id))}
        </ul>
      </div>
      {through.map((g) => (
        <div key={g.via} className="space-y-2">
          <h3 className="font-medium">
            {fmt(t.map.through, { name: name.get(g.via) ?? '' })}
          </h3>
          <ul className="divide-y divide-border rounded-xl card">
            {g.people.map((d) => row(d.other, d.text, d.l.label, d.l.id))}
          </ul>
        </div>
      ))}
    </section>
  );
}
