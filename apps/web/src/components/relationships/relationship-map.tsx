'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { Messages } from '@/i18n/en';
import { fmt } from '@/i18n/format';
import { initials } from '@/lib/avatar';
import {
  bounds,
  familyTree,
  type Group,
  groupOf,
  GROUPS,
  type MapData,
  type Point,
  rings,
  visible,
} from '@/lib/map-layout';

type Layout = 'everyone' | 'family';
type T = Messages['relationships'];

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 4;
const clamp = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));
const short = (s: string) => (s.length > 18 ? `${s.slice(0, 17)}…` : s);

const chip =
  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none';
const tool =
  'inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-lg font-semibold hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none';

/**
 * The relationship map (P6b, ADR 0024): SVG, drawn from a fixed layout,
 * with drag to move, pinch or wheel to zoom, and kind filters. Everything
 * on it is also in the list below it.
 */
export function RelationshipMap({
  data,
  initialLayout,
  t,
}: {
  data: MapData;
  initialLayout: Layout;
  t: T;
}) {
  const focusId = data.focusId!;
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [shown, setShown] = useState<ReadonlySet<Group>>(new Set(GROUPS));
  const [selected, setSelected] = useState<string>(focusId);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const svg = useRef<SVGSVGElement>(null);

  const { people, links } = useMemo(
    () => visible(data, layout === 'family' ? new Set(['family']) : shown),
    [data, layout, shown],
  );
  const pos = useMemo(
    () =>
      layout === 'family'
        ? familyTree(focusId, people, links)
        : rings(focusId, people, links),
    [layout, focusId, people, links],
  );
  const drawn = people.filter((p) => pos.has(p.id));
  const box = useMemo(() => bounds(pos.values()), [pos]);
  const name = new Map(data.people.map((p) => [p.id, p.displayName]));
  const focusName = name.get(focusId) ?? '';
  const chosen = drawn.find((p) => p.id === selected) ?? drawn[0];

  const fit = () => setView({ k: 1, x: 0, y: 0 });

  /** Screen pixels to map units. */
  const unit = () => {
    const r = svg.current?.getBoundingClientRect();
    return r && r.width > 0 ? Math.max(box.w / r.width, box.h / r.height) : 1;
  };
  /** A point on screen, in the map's coordinates. */
  const toMap = (cx: number, cy: number): Point => {
    const r = svg.current!.getBoundingClientRect();
    const u = unit();
    // preserveAspectRatio="xMidYMid meet": the box is centred.
    const ox = (r.width * u - box.w) / 2;
    const oy = (r.height * u - box.h) / 2;
    return {
      x: box.x - ox + (cx - r.left) * u,
      y: box.y - oy + (cy - r.top) * u,
    };
  };
  const zoomAt = (factor: number, at?: Point) =>
    setView((v) => {
      const k = clamp(v.k * factor);
      const c = at ?? { x: box.x + box.w / 2, y: box.y + box.h / 2 };
      return {
        k,
        x: c.x - (c.x - v.x) * (k / v.k),
        y: c.y - (c.y - v.y) * (k / v.k),
      };
    });

  // Wheel zoom needs a non-passive listener to keep the page still.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, toMap(e.clientX, e.clientY));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  // Drag to move; two fingers to zoom. A press that barely moves is a tap.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const onDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) moved.current = 0;
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const all = [...pointers.current.values()];
    if (pointers.current.size === 2) {
      const other = all.find((p) => p !== prev)!;
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      if (before > 0) {
        zoomAt(
          after / before,
          toMap((e.clientX + other.x) / 2, (e.clientY + other.y) / 2),
        );
      }
      moved.current += 10;
    } else {
      const u = unit();
      const dx = (e.clientX - prev.x) * u;
      const dy = (e.clientY - prev.y) * u;
      moved.current += Math.abs(dx) + Math.abs(dy);
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onUp = (e: React.PointerEvent) => pointers.current.delete(e.pointerId);
  const pick = (id: string) => {
    if (moved.current < 6 * unit()) setSelected(id);
  };

  const toggle = (g: Group) => {
    setShown((s) => {
      const next = new Set(s);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next.size === 0 ? s : next;
    });
    fit();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">{t.map.layout}</span>
        {(['everyone', 'family'] as const).map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={layout === l}
            onClick={() => {
              // A new layout starts from the whole picture.
              setLayout(l);
              fit();
            }}
            className={`${chip} ${layout === l ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface'}`}
          >
            {l === 'everyone' ? t.map.everyone : t.map.familyTree}
          </button>
        ))}
      </div>
      {layout === 'everyone' ? (
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={t.map.show}
        >
          <span className="text-sm text-muted">{t.map.show}</span>
          {GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={shown.has(g)}
              onClick={() => toggle(g)}
              className={`${chip} ${shown.has(g) ? 'border-border bg-surface' : 'border-dashed border-border text-muted opacity-60'}`}
            >
              <svg width="22" height="6" aria-hidden="true">
                <line
                  x1="1"
                  y1="3"
                  x2="21"
                  y2="3"
                  className={`map-link map-${g}`}
                />
              </svg>
              {t.roleGroups[g]}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">{t.map.familyOnly}</p>
      )}

      <div className="relative overflow-hidden rounded-2xl card">
        <svg
          ref={svg}
          role="img"
          aria-label={fmt(t.map.label, { name: focusName })}
          viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="map-canvas block h-[62vh] min-h-80 w-full select-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
          data-testid="relationship-map"
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {links.map((l) => {
              const a = pos.get(l.fromId);
              const b = pos.get(l.toId);
              if (!a || !b) return null;
              // Two links between the same pair bow apart instead of
              // hiding each other.
              const same = links.filter(
                (o) =>
                  (o.fromId === l.fromId && o.toId === l.toId) ||
                  (o.fromId === l.toId && o.toId === l.fromId),
              );
              const i = same.indexOf(l);
              const bend = (i - (same.length - 1) / 2) * 28;
              const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
              const cx = (a.x + b.x) / 2 - ((b.y - a.y) / len) * bend;
              const cy = (a.y + b.y) / 2 + ((b.x - a.x) / len) * bend;
              return (
                <path
                  key={l.id}
                  d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
                  className={`map-link map-${groupOf(l.kind)}`}
                />
              );
            })}
            {drawn.map((p) => {
              const at = pos.get(p.id)!;
              const focus = p.id === focusId;
              const isSel = p.id === chosen?.id;
              const r = focus ? 30 : 22;
              return (
                <g
                  key={p.id}
                  transform={`translate(${at.x} ${at.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={p.displayName}
                  aria-pressed={isSel}
                  onClick={() => pick(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(p.id);
                    }
                  }}
                  className="cursor-pointer focus-visible:outline-none [&:focus-visible>circle]:stroke-foreground"
                  data-person={p.id}
                >
                  <circle
                    r={r}
                    strokeWidth={isSel ? 3 : 1.5}
                    className={
                      focus
                        ? 'fill-accent-soft stroke-accent'
                        : isSel
                          ? 'fill-background stroke-foreground'
                          : 'fill-background stroke-border'
                    }
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={`pointer-events-none fill-accent font-semibold ${focus ? 'text-base' : 'text-[13px]'}`}
                  >
                    {initials(p.displayName)}
                  </text>
                  <text
                    y={r + 16}
                    textAnchor="middle"
                    className={`map-name pointer-events-none fill-foreground ${focus ? 'text-sm font-semibold' : 'text-xs'}`}
                  >
                    {short(p.displayName)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
        <div className="absolute right-3 bottom-3 flex flex-col gap-2">
          <button
            type="button"
            className={tool}
            aria-label={t.map.zoomIn}
            onClick={() => zoomAt(1.3)}
          >
            +
          </button>
          <button
            type="button"
            className={tool}
            aria-label={t.map.zoomOut}
            onClick={() => zoomAt(1 / 1.3)}
          >
            −
          </button>
          <button type="button" className={`${tool} text-xs`} onClick={fit}>
            {t.map.fit}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted">{t.map.hint}</p>

      {drawn.length <= 1 ? (
        <p className="text-sm text-muted">{t.map.nobodyShown}</p>
      ) : (
        chosen && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl card p-4"
            data-testid="map-selected"
          >
            <p className="min-w-0 font-medium break-words">
              {chosen.displayName}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/contacts/${chosen.id}`}
                className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:bg-surface-hover"
              >
                {t.map.open}
              </Link>
              {chosen.id !== focusId && (
                <Link
                  href={`/contacts/map?focus=${chosen.id}${layout === 'family' ? '&layout=family' : ''}`}
                  className="rounded-lg btn-primary px-4 py-2.5 text-sm font-medium"
                >
                  {t.map.centreHere}
                </Link>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
