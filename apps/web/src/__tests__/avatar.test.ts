import { describe, expect, it } from 'vitest';

import {
  AVATAR_COLOURS,
  avatarColour,
  indexLetter,
  initials,
} from '@/lib/avatar';

describe('initials', () => {
  it('uses the first and last word', () => {
    expect(initials('Ann Wanjiru')).toBe('AW');
    expect(initials('Mary Wanjiku Njeri')).toBe('MN');
    expect(initials('bob')).toBe('B');
  });

  it('handles accents, emails and numbers-only names', () => {
    expect(initials('Émilie Otieno')).toBe('EO');
    expect(initials('kuria.mwangi@example.com')).toBe('KM');
    expect(initials('0712 345 678')).toBe('#');
    expect(initials('*144#')).toBe('#');
  });
});

describe('avatarColour', () => {
  it('is stable for the same key and from the palette', () => {
    expect(avatarColour('abc')).toBe(avatarColour('abc'));
    expect(AVATAR_COLOURS).toContain(avatarColour('anything'));
  });
});

describe('indexLetter', () => {
  it('files names under A–Z, others under #', () => {
    expect(indexLetter('émile')).toBe('E');
    expect(indexLetter('  zed')).toBe('Z');
    expect(indexLetter('0712')).toBe('#');
  });
});
