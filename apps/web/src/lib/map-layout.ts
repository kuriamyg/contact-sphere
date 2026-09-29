/**
 * Relationship map layout (P6b, ADR 0024). Pure functions: the page draws
 * the result as SVG. No graph library: two fixed layouts read better on a
 * phone than a force-directed tangle, and nothing needs inline styles.
 */

export interface MapPerson {
  id: string;
  displayName: string;
  depth: number;
}

export interface MapLink {
  id: string;
  fromId: string;
  toId: string;
  kind: string;
  label: string | null;
}

export interface MapData {
  focusId: string | null;
  people: MapPerson[];
  links: MapLink[];
  truncated: boolean;
}

export const GROUPS = ['family', 'met', 'life', 'work'] as const;
export type Group = (typeof GROUPS)[number];

const KIND_GROUP: Record<string, Group> = {
  parent: 'family',
  spouse: 'family',
  sibling: 'family',
  cousin: 'family',
  relative: 'family',
  introduced: 'met',
  friend: 'life',
  neighbour: 'life',
  church: 'life',
  chama: 'life',
  colleague: 'work',
  client: 'work',
  mentor: 'work',
  other: 'work',
};
export const groupOf = (kind: string): Group => KIND_GROUP[kind] ?? 'work';

export interface Point {
  x: number;
  y: number;
}

/**
 * Only the links of the shown kinds, and only the people still reachable
 * from the focus through them (at most two steps), with their new depth.
 */
export function visible(
  data: MapData,
  groups: ReadonlySet<Group>,
): { people: MapPerson[]; links: MapLink[] } {
  if (!data.focusId) return { people: [], links: [] };
  const links = data.links.filter((l) => groups.has(groupOf(l.kind)));
  const byId = new Map(data.people.map((p) => [p.id, p]));
  const depth = new Map([[data.focusId, 0]]);
  let frontier = [data.focusId];
  for (let d = 1; d <= 2; d++) {
    const found: string[] = [];
    for (const id of frontier) {
      for (const l of links) {
        const other =
          l.fromId === id ? l.toId : l.toId === id ? l.fromId : null;
        if (other && byId.has(other) && !depth.has(other)) {
          depth.set(other, d);
          found.push(other);
        }
      }
    }
    frontier = found;
  }
  return {
    people: data.people
      .filter((p) => depth.has(p.id))
      .map((p) => ({ ...p, depth: depth.get(p.id)! })),
    links: links.filter((l) => depth.has(l.fromId) && depth.has(l.toId)),
  };
}

const neighbours = (links: readonly MapLink[], id: string) =>
  links.flatMap((l) =>
    l.fromId === id
      ? [{ id: l.toId, link: l }]
      : l.toId === id
        ? [{ id: l.fromId, link: l }]
        : [],
  );

/**
 * Focus in the middle; the people linked to them on a ring, grouped by kind
 * of link; the people two steps away on an outer ring, beside whoever links
 * them in.
 */
export function rings(
  focusId: string,
  people: readonly MapPerson[],
  links: readonly MapLink[],
): Map<string, Point> {
  const pos = new Map<string, Point>([[focusId, { x: 0, y: 0 }]]);
  const name = new Map(people.map((p) => [p.id, p.displayName]));
  const first = neighbours(links, focusId)
    .filter((n) => people.some((p) => p.id === n.id && p.depth === 1))
    .sort(
      (a, b) =>
        GROUPS.indexOf(groupOf(a.link.kind)) -
          GROUPS.indexOf(groupOf(b.link.kind)) ||
        (name.get(a.id) ?? '').localeCompare(name.get(b.id) ?? ''),
    )
    .map((n) => n.id)
    .filter((id, i, all) => all.indexOf(id) === i);
  const n1 = first.length;
  if (n1 === 0) return pos;
  const r1 = Math.max(130, (n1 * 64) / (2 * Math.PI));
  const angle = new Map<string, number>();
  first.forEach((id, i) => {
    const a = (2 * Math.PI * i) / n1 - Math.PI / 2;
    angle.set(id, a);
    pos.set(id, { x: r1 * Math.cos(a), y: r1 * Math.sin(a) });
  });

  // Each outer person sits in the sector of the first inner person linking
  // them in.
  const kids = new Map<string, string[]>();
  for (const p of people) {
    if (p.depth !== 2) continue;
    const parent = first.find((f) =>
      links.some(
        (l) =>
          (l.fromId === f && l.toId === p.id) ||
          (l.toId === f && l.fromId === p.id),
      ),
    );
    if (parent) kids.set(parent, [...(kids.get(parent) ?? []), p.id]);
  }
  const sector = ((2 * Math.PI) / n1) * 0.85;
  let r2 = r1 + 130;
  for (const list of kids.values()) {
    if (list.length > 1) r2 = Math.max(r2, (list.length * 60) / sector);
  }
  for (const [parent, list] of kids) {
    const mid = angle.get(parent)!;
    list
      .sort((a, b) => (name.get(a) ?? '').localeCompare(name.get(b) ?? ''))
      .forEach((id, i) => {
        const a =
          list.length === 1
            ? mid
            : mid - sector / 2 + (sector * i) / (list.length - 1);
        pos.set(id, { x: r2 * Math.cos(a), y: r2 * Math.sin(a) });
      });
  }
  return pos;
}

const ROW = 140;
const COL = 130;

/**
 * A family tree: older generations above, younger below, spouses, brothers,
 * sisters and cousins beside. Only family links; anyone not reached through
 * them is left out.
 */
export function familyTree(
  focusId: string,
  people: readonly MapPerson[],
  links: readonly MapLink[],
): Map<string, Point> {
  const known = new Set(people.map((p) => p.id));
  const family = links.filter((l) => groupOf(l.kind) === 'family');
  const gen = new Map([[focusId, 0]]);
  const order = [focusId];
  for (let i = 0; i < order.length; i++) {
    const id = order[i];
    const g = gen.get(id)!;
    for (const l of family) {
      let other: string | null = null;
      let og = g;
      if (l.fromId === id) {
        other = l.toId;
        if (l.kind === 'parent') og = g + 1;
      } else if (l.toId === id) {
        other = l.fromId;
        if (l.kind === 'parent') og = g - 1;
      }
      if (other && known.has(other) && !gen.has(other)) {
        gen.set(other, og);
        order.push(other);
      }
    }
  }
  const rows = new Map<number, string[]>();
  for (const id of order) {
    const g = gen.get(id)!;
    rows.set(g, [...(rows.get(g) ?? []), id]);
  }
  const pos = new Map<string, Point>();
  for (const [g, ids] of rows) {
    // The focus stays in the middle of their own row.
    const rest = g === 0 ? ids.slice(1) : ids;
    const half = Math.ceil(rest.length / 2);
    const row =
      g === 0 ? [...rest.slice(0, half), focusId, ...rest.slice(half)] : ids;
    row.forEach((id, i) =>
      pos.set(id, { x: (i - (row.length - 1) / 2) * COL, y: g * ROW }),
    );
  }
  return pos;
}

/** The box around every point, with room for a name under each. */
export function bounds(points: Iterable<Point>): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  let [x0, y0, x1, y1] = [0, 0, 0, 0];
  for (const p of points) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  const pad = 80;
  return {
    x: x0 - pad,
    y: y0 - pad,
    w: x1 - x0 + 2 * pad,
    h: y1 - y0 + 2 * pad + 20,
  };
}
