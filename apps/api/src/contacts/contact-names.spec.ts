import {
  deriveDisplayName,
  normaliseTags,
  searchText,
  searchWords,
  sortKey,
} from './contact-names';

describe('deriveDisplayName', () => {
  it('prefers an explicit display name, tidied', () => {
    expect(deriveDisplayName({ displayName: '  Mama  Njeri ' })).toBe(
      'Mama Njeri',
    );
  });

  it('falls back through name, nickname, organisation, phone, email', () => {
    expect(deriveDisplayName({ givenName: 'Ann', familyName: 'Wanjiru' })).toBe(
      'Ann Wanjiru',
    );
    expect(deriveDisplayName({ familyName: 'Otieno' })).toBe('Otieno');
    expect(deriveDisplayName({ nickname: 'Kim' })).toBe('Kim');
    expect(deriveDisplayName({ organization: 'Acme' })).toBe('Acme');
    expect(deriveDisplayName({ firstPhone: '0712 345 678' })).toBe(
      '0712 345 678',
    );
    expect(deriveDisplayName({ firstEmail: 'a@b.co' })).toBe('a@b.co');
  });

  it('is empty only when nothing identifies the contact', () => {
    expect(deriveDisplayName({ givenName: '  ' })).toBe('');
  });
});

describe('sortKey', () => {
  it('folds case and accents', () => {
    expect(sortKey('Émile Zola')).toBe('emile zola');
    expect(sortKey('ann')).toBe(sortKey('Ann'));
  });
});

describe('know-who search (Phase 7)', () => {
  it('normalises tags: trimmed, lower-case, one space, no repeats, max 20', () => {
    expect(
      normaliseTags([' Plumber ', 'plumber', 'Boda  Boda', '', ' ']),
    ).toEqual(['plumber', 'boda boda']);
    expect(
      normaliseTags(Array.from({ length: 30 }, (_, i) => `t${i}`)),
    ).toHaveLength(20);
    expect(normaliseTags(['x'.repeat(41)])).toEqual([]);
  });

  it('folds every searchable field into one line', () => {
    expect(
      searchText({
        displayName: 'Émile Otieno',
        organization: 'Acme',
        area: 'Kasarani',
        metThrough: 'Church',
        tags: ['plumber'],
        notes: 'Fixed the\n  sink',
      }),
    ).toBe('emile otieno acme kasarani church plumber fixed the sink');
  });

  it('splits a query into folded words', () => {
    expect(searchWords('  Plumber   KASARANI ')).toEqual([
      'plumber',
      'kasarani',
    ]);
    expect(searchWords('Émile')).toEqual(['emile']);
    expect(searchWords('a b c d e f g h')).toHaveLength(6);
  });
});
