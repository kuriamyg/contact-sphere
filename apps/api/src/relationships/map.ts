import type { RelationshipKind } from './kinds';

/** One stored link, as the map needs it. */
export interface MapEdge {
  id: string;
  fromId: string;
  toId: string;
  kind: RelationshipKind;
  label: string | null;
}

/** Most people the map draws at once; beyond it the list says "more". */
export const MAP_MAX_PEOPLE = 300;
/** Focus, their links, and their links' links. */
export const MAP_DEPTH = 2;

/**
 * The person to centre on: the one asked for, else the owner's own card if
 * it has links, else whoever has the most links (ties: smaller id).
 */
export function pickFocus(
  edges: readonly MapEdge[],
  asked: string | null,
  card: string | null,
): string | null {
  if (asked) return asked;
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.fromId, (degree.get(e.fromId) ?? 0) + 1);
    degree.set(e.toId, (degree.get(e.toId) ?? 0) + 1);
  }
  if (card && degree.has(card)) return card;
  let best: string | null = null;
  for (const [id, n] of degree) {
    const b = best === null ? -1 : degree.get(best)!;
    if (n > b || (n === b && best !== null && id < best)) best = id;
  }
  return best;
}

/**
 * Everyone within MAP_DEPTH links of the focus, nearest first, up to
 * MAP_MAX_PEOPLE; and the links among them.
 */
export function neighbourhood(
  edges: readonly MapEdge[],
  focus: string,
): {
  depth: Map<string, number>;
  edges: MapEdge[];
  truncated: boolean;
} {
  const next = new Map<string, string[]>();
  const add = (a: string, b: string) =>
    next.set(a, [...(next.get(a) ?? []), b]);
  for (const e of edges) {
    add(e.fromId, e.toId);
    add(e.toId, e.fromId);
  }
  const depth = new Map<string, number>([[focus, 0]]);
  let frontier = [focus];
  let truncated = false;
  for (let d = 1; d <= MAP_DEPTH && frontier.length > 0; d++) {
    const found: string[] = [];
    for (const id of frontier) {
      for (const n of next.get(id) ?? []) {
        if (depth.has(n)) continue;
        if (depth.size >= MAP_MAX_PEOPLE) {
          truncated = true;
          continue;
        }
        depth.set(n, d);
        found.push(n);
      }
    }
    frontier = found;
  }
  return {
    depth,
    edges: edges.filter((e) => depth.has(e.fromId) && depth.has(e.toId)),
    truncated,
  };
}
