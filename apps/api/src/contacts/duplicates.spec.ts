import { findDuplicates, pairKey } from './duplicates';

const c = (
  id: string,
  sortName: string,
  phones: string[] = [],
  emails: string[] = [],
) => ({
  id,
  sortName,
  phones: phones.map((p) =>
    p.startsWith('+')
      ? { e164: p, digits: p.slice(1) }
      : { e164: null, digits: p.replace(/\D/g, '') },
  ),
  emails,
});

describe('findDuplicates', () => {
  it('pairs contacts sharing a number or email, with high confidence', () => {
    const pairs = findDuplicates(
      [
        c('1', 'ann wanjiru', ['+254712345678']),
        c('2', 'mama njeri', ['+254712345678']),
        c('3', 'bob', [], ['bob@x.co']),
        c('4', 'robert', [], ['bob@x.co']),
        c('5', 'alone', ['+254700000000']),
      ],
      new Set(),
    );
    expect(pairs).toEqual([
      { aId: '1', bId: '2', reasons: ['same_phone'], confidence: 'high' },
      { aId: '3', bId: '4', reasons: ['same_email'], confidence: 'high' },
    ]);
  });

  it('finds same and reordered names with medium confidence', () => {
    const pairs = findDuplicates(
      [
        c('1', 'ann wanjiru'),
        c('2', 'ann wanjiru'),
        c('3', 'wanjiru ann'),
        c('4', 'kim'),
        c('5', 'kim'),
      ],
      new Set(),
    );
    const byKey = Object.fromEntries(
      pairs.map((p) => [`${p.aId}${p.bId}`, p.reasons]),
    );
    expect(byKey).toEqual({
      '12': ['same_name'],
      '13': ['similar_name'],
      '23': ['similar_name'],
      '45': ['same_name'],
    });
    expect(pairs.every((p) => p.confidence === 'medium')).toBe(true);
  });

  it('ranks number + name above name alone, and lists all reasons', () => {
    const pairs = findDuplicates(
      [
        c('1', 'kim', ['+254711111111']),
        c('2', 'kim', ['+254711111111']),
        c('3', 'zed'),
        c('4', 'zed'),
      ],
      new Set(),
    );
    expect(pairs[0]).toEqual({
      aId: '1',
      bId: '2',
      reasons: ['same_phone', 'same_name'],
      confidence: 'high',
    });
  });

  it('matches unparsed numbers by digits, but not short codes', () => {
    const pairs = findDuplicates(
      [
        c('1', 'a', ['0712 345 678']),
        c('2', 'b', ['0712-345-678']),
        c('3', 'c', ['*144#']),
        c('4', 'd', ['*144#']),
      ],
      new Set(),
    );
    expect(pairs.map((p) => pairKey(p.aId, p.bId))).toEqual(['1|2']);
  });

  it('ignores numbers shared by many contacts (office lines) and dismissed pairs', () => {
    const office = Array.from({ length: 12 }, (_, i) =>
      c(`o${i}`, `staff ${i}`, ['+254202000000']),
    );
    expect(findDuplicates(office, new Set())).toEqual([]);
    expect(
      findDuplicates(
        [c('1', 'x', ['+254711111111']), c('2', 'y', ['+254711111111'])],
        new Set([pairKey('2', '1')]),
      ),
    ).toEqual([]);
  });
});
