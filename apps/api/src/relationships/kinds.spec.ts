import { ordered, roleFor, ROLE_NAMES, toRow } from './kinds';

const A = '0191f000-0000-7000-8000-00000000000a';
const B = '0191f000-0000-7000-8000-00000000000b';

describe('relationship roles (P6)', () => {
  it('stores directed links from → to', () => {
    // On A's page: "B is A's parent" → B is the parent of A.
    expect(toRow('parent', A, B)).toEqual({
      kind: 'parent',
      fromId: B,
      toId: A,
    });
    expect(toRow('child', A, B)).toEqual({
      kind: 'parent',
      fromId: A,
      toId: B,
    });
    expect(toRow('introducedBy', B, A)).toEqual({
      kind: 'introduced',
      fromId: A,
      toId: B,
    });
  });

  it('stores two-way links once, smaller id first', () => {
    expect(toRow('sibling', B, A)).toEqual({
      kind: 'sibling',
      fromId: A,
      toId: B,
    });
    expect(toRow('sibling', A, B)).toEqual({
      kind: 'sibling',
      fromId: A,
      toId: B,
    });
    expect(ordered('friend', B, A)).toEqual({ fromId: A, toId: B });
    expect(ordered('mentor', B, A)).toEqual({ fromId: B, toId: A });
  });

  it('reads back the same role from each side', () => {
    for (const role of ROLE_NAMES) {
      const row = toRow(role, A, B);
      // On A's page, B is the other contact: is B the "from" end?
      expect(roleFor(row.kind, row.fromId === B)).toBe(role);
    }
  });
});
