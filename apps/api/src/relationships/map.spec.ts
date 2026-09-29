import { MAP_MAX_PEOPLE, type MapEdge, neighbourhood, pickFocus } from './map';

const e = (fromId: string, toId: string, kind: MapEdge['kind'] = 'friend') => ({
  id: `${fromId}-${toId}-${kind}`,
  fromId,
  toId,
  kind,
  label: null,
});

describe('relationship map', () => {
  const edges = [e('a', 'b', 'parent'), e('b', 'c'), e('c', 'd'), e('x', 'y')];

  it('centres on the asked person, else the card, else the best connected', () => {
    expect(pickFocus(edges, 'd', 'a')).toBe('d');
    expect(pickFocus(edges, null, 'a')).toBe('a');
    // A card with no links is not a useful centre.
    expect(pickFocus(edges, null, 'zzz')).toBe('b');
    expect(pickFocus([], null, 'a')).toBeNull();
  });

  it('keeps two steps from the focus and only the links among them', () => {
    const n = neighbourhood(edges, 'a');
    expect([...n.depth]).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ]);
    expect(n.edges.map((x) => x.id)).toEqual(['a-b-parent', 'b-c-friend']);
    expect(n.truncated).toBe(false);
  });

  it('stops at the size limit and says so', () => {
    const many = Array.from({ length: MAP_MAX_PEOPLE + 5 }, (_, i) =>
      e('hub', `p${String(i).padStart(3, '0')}`),
    );
    const n = neighbourhood(many, 'hub');
    expect(n.depth.size).toBe(MAP_MAX_PEOPLE);
    expect(n.truncated).toBe(true);
    expect(n.edges).toHaveLength(MAP_MAX_PEOPLE - 1);
  });
});
