/**
 * Relationship kinds (P6, ADR 0023). Directed kinds read "from … to":
 * parent (from is the parent of to), introduced (from introduced the owner
 * to to), mentor (from mentors to), client (from is a client of to). The
 * others read the same both ways and are stored smaller id first.
 */
export const RELATIONSHIP_KINDS = [
  'parent',
  'spouse',
  'sibling',
  'cousin',
  'relative',
  'introduced',
  'friend',
  'colleague',
  'neighbour',
  'church',
  'chama',
  'client',
  'mentor',
  'other',
] as const;
export type RelationshipKind = (typeof RELATIONSHIP_KINDS)[number];

export const DIRECTED: readonly RelationshipKind[] = [
  'parent',
  'introduced',
  'client',
  'mentor',
];

/**
 * What the owner picks on contact X's page about another contact Y ("Y is
 * X's …"), and how it is stored.
 */
export const ROLES = {
  parent: { kind: 'parent', yIsFrom: true },
  child: { kind: 'parent', yIsFrom: false },
  spouse: { kind: 'spouse' },
  sibling: { kind: 'sibling' },
  cousin: { kind: 'cousin' },
  relative: { kind: 'relative' },
  introducedBy: { kind: 'introduced', yIsFrom: true },
  introduced: { kind: 'introduced', yIsFrom: false },
  friend: { kind: 'friend' },
  colleague: { kind: 'colleague' },
  neighbour: { kind: 'neighbour' },
  church: { kind: 'church' },
  chama: { kind: 'chama' },
  client: { kind: 'client', yIsFrom: true },
  supplier: { kind: 'client', yIsFrom: false },
  mentor: { kind: 'mentor', yIsFrom: true },
  mentee: { kind: 'mentor', yIsFrom: false },
  other: { kind: 'other' },
} as const satisfies Record<
  string,
  { kind: RelationshipKind; yIsFrom?: boolean }
>;
export type Role = keyof typeof ROLES;
export const ROLE_NAMES = Object.keys(ROLES) as Role[];

/** How a stored link reads from one contact's side. */
export function roleFor(kind: RelationshipKind, otherIsFrom: boolean): Role {
  switch (kind) {
    case 'parent':
      return otherIsFrom ? 'parent' : 'child';
    case 'introduced':
      return otherIsFrom ? 'introducedBy' : 'introduced';
    case 'client':
      return otherIsFrom ? 'client' : 'supplier';
    case 'mentor':
      return otherIsFrom ? 'mentor' : 'mentee';
    default:
      return kind;
  }
}

/** The stored row for "Y is X's <role>". */
export function toRow(
  role: Role,
  x: string,
  y: string,
): { kind: RelationshipKind; fromId: string; toId: string } {
  const r = ROLES[role] as { kind: RelationshipKind; yIsFrom?: boolean };
  if (DIRECTED.includes(r.kind)) {
    return r.yIsFrom
      ? { kind: r.kind, fromId: y, toId: x }
      : { kind: r.kind, fromId: x, toId: y };
  }
  return x < y
    ? { kind: r.kind, fromId: x, toId: y }
    : { kind: r.kind, fromId: y, toId: x };
}

/** Put a stored pair in the order the database requires. */
export function ordered(
  kind: RelationshipKind,
  fromId: string,
  toId: string,
): { fromId: string; toId: string } {
  return DIRECTED.includes(kind) || fromId < toId
    ? { fromId, toId }
    : { fromId: toId, toId: fromId };
}
