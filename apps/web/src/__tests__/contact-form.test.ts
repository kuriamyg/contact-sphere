import { describe, expect, it } from 'vitest';

import {
  EMPTY_CONTACT,
  fromContact,
  readContactForm,
  toContactInput,
} from '@/lib/contact-form';

function form(entries: [string, string][]): FormData {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
}

describe('readContactForm + toContactInput', () => {
  it('pairs phone and email rows with their labels, in order', () => {
    const v = readContactForm(
      form([
        ['givenName', ' Ann '],
        ['phoneRaw', '0712 345 678'],
        ['phoneLabel', 'mobile'],
        ['phoneRaw', '0733 000 000'],
        ['phoneLabel', ''],
        ['emailAddress', 'ann@example.com'],
        ['emailLabel', 'work'],
      ]),
    );
    expect(toContactInput(v)).toEqual({
      givenName: 'Ann',
      phones: [
        { raw: '0712 345 678', label: 'mobile' },
        { raw: '0733 000 000' },
      ],
      emails: [{ address: 'ann@example.com', label: 'work' }],
    });
  });

  it('drops blank fields and blank rows, keeping empty lists (so a save clears them)', () => {
    const v = readContactForm(
      form([
        ['givenName', '   '],
        ['organization', 'Acme'],
        ['phoneRaw', '  '],
        ['phoneLabel', 'mobile'],
        ['emailAddress', ''],
        ['emailLabel', ''],
      ]),
    );
    expect(toContactInput(v)).toEqual({
      organization: 'Acme',
      phones: [],
      emails: [],
    });
  });

  it('never sends fields that are not part of the form', () => {
    const v = readContactForm(
      form([
        ['givenName', 'Ann'],
        ['ownerId', 'someone-else'],
        ['id', 'x'],
      ]),
    );
    expect(Object.keys(toContactInput(v)).sort()).toEqual([
      'emails',
      'givenName',
      'phones',
    ]);
  });
});

describe('fromContact', () => {
  const base = {
    givenName: 'Ann',
    familyName: 'Wanjiru',
    nickname: null,
    organization: null,
    jobTitle: null,
    birthday: null,
    notes: null,
    phones: [],
    emails: [],
  };

  it('leaves the display name blank when the API derived it', () => {
    expect(
      fromContact({ ...base, displayName: 'Ann Wanjiru' }).displayName,
    ).toBe('');
    expect(
      fromContact({ ...base, displayName: 'Mama Njeri' }).displayName,
    ).toBe('Mama Njeri');
  });

  it('offers one blank row when there are no numbers or emails', () => {
    const v = fromContact({ ...base, displayName: 'Ann Wanjiru' });
    expect(v.phones).toEqual(EMPTY_CONTACT.phones);
    expect(v.emails).toEqual(EMPTY_CONTACT.emails);
  });
});
