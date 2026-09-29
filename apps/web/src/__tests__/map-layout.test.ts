import { describe, expect, it } from 'vitest';

import {
  bounds,
  familyTree,
  GROUPS,
  type MapData,
  rings,
  visible,
} from '@/lib/map-layout';

const person = (id: string, depth: number) => ({
  id,
  displayName: id.toUpperCase(),
  depth,
});
const link = (fromId: string, toId: string, kind: string) => ({
  id: `${fromId}${toId}${kind}`,
  fromId,
  toId,
  kind,
  label: null,
});

// Grandma → mum → me; me – wife; me – colleague – their friend.
const data: MapData = {
  focusId: 'me',
  truncated: false,
  people: [
    person('me', 0),
    person('mum', 1),
    person('wife', 1),
    person('col', 1),
    person('gran', 2),
    person('pal', 2),
  ],
  links: [
    link('gran', 'mum', 'parent'),
    link('mum', 'me', 'parent'),
    link('me', 'wife', 'spouse'),
    link('col', 'me', 'colleague'),
    link('col', 'pal', 'friend'),
  ],
};

describe('relationship map layout', () => {
  it('filters by kind and drops people no longer reachable', () => {
    const all = visible(data, new Set(GROUPS));
    expect(all.people).toHaveLength(6);
    const family = visible(data, new Set(['family'] as const));
    expect(family.people.map((p) => p.id).sort()).toEqual([
      'gran',
      'me',
      'mum',
      'wife',
    ]);
    expect(family.links).toHaveLength(3);
  });

  it('puts the focus in the middle, first ring closer than the second', () => {
    const pos = rings('me', data.people, data.links);
    expect(pos.get('me')).toEqual({ x: 0, y: 0 });
    const r = (id: string) => Math.hypot(pos.get(id)!.x, pos.get(id)!.y);
    expect(r('mum')).toBeCloseTo(r('wife'));
    expect(r('gran')).toBeGreaterThan(r('mum'));
    expect(pos.size).toBe(6);
  });

  it('draws a family tree by generation', () => {
    const pos = familyTree('me', data.people, data.links);
    expect(pos.get('gran')!.y).toBeLessThan(pos.get('mum')!.y);
    expect(pos.get('mum')!.y).toBeLessThan(pos.get('me')!.y);
    expect(pos.get('wife')!.y).toBe(pos.get('me')!.y);
    // Colleagues are not family.
    expect(pos.has('col')).toBe(false);
  });

  it('frames every point with room around it', () => {
    const b = bounds([
      { x: -10, y: 0 },
      { x: 50, y: 30 },
    ]);
    expect(b.x).toBeLessThan(-10);
    expect(b.x + b.w).toBeGreaterThan(50);
    expect(b.y + b.h).toBeGreaterThan(30);
  });
});
