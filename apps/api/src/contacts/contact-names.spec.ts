import { deriveDisplayName, sortKey } from './contact-names';

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
