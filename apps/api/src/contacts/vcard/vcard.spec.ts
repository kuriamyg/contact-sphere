import { parseVcf } from './parse';
import { writeVcard } from './write';

const crlf = (s: string) =>
  s
    .trim()
    .split('\n')
    .map((l) => l.replace(/^ {4}/, ''))
    .join('\r\n');

describe('parseVcf', () => {
  it('reads an Android vCard 2.1 export: quoted-printable UTF-8, bare types, soft line breaks', () => {
    const r = parseVcf(
      crlf(`
    BEGIN:VCARD
    VERSION:2.1
    N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Wanjiru;=C3=89milie;;;
    FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=C3=89milie Wanjiru
    TEL;CELL;PREF:0712 345 678
    TEL;HOME:+254733111222
    NOTE;ENCODING=QUOTED-PRINTABLE;CHARSET=UTF-8:Met at church=0A=
    Likes tea
    PHOTO;ENCODING=BASE64;JPEG:/9j/4AAQSkZJRgABAQAAAQABAAD
     /2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4n
    
    END:VCARD`),
    );
    expect(r.cardCount).toBe(1);
    expect(r.cards[0]).toEqual({
      displayName: 'Émilie Wanjiru',
      givenName: 'Émilie',
      familyName: 'Wanjiru',
      notes: 'Met at church\nLikes tea',
      phones: [
        { raw: '0712 345 678', label: 'mobile' },
        { raw: '+254733111222', label: 'home' },
      ],
      emails: [],
    });
  });

  it('reads an iPhone vCard 3.0: folded lines, grouped labels, escapes, birthday', () => {
    const r = parseVcf(
      crlf(`
    BEGIN:VCARD
    VERSION:3.0
    N:Otieno;David;;;
    FN:David Otieno
    ORG:Acme\\, Ltd;Sales
    TITLE:Head of
      Sales
    item1.TEL;type=pref:+44 20 7946 0958
    item1.X-ABLabel:_$!<Mobile>!$_
    item2.EMAIL;type=INTERNET:David@Example.COM
    item2.X-ABLabel:Church
    BDAY:1985-02-28
    NICKNAME:Dave,DO
    END:VCARD`),
    );
    expect(r.cards[0]).toEqual({
      displayName: 'David Otieno',
      givenName: 'David',
      familyName: 'Otieno',
      organization: 'Acme, Ltd',
      jobTitle: 'Head of Sales',
      nickname: 'Dave',
      birthday: '1985-02-28',
      phones: [{ raw: '+44 20 7946 0958', label: 'mobile' }],
      emails: [{ address: 'david@example.com', label: 'church' }],
    });
  });

  it('reads vCard 4.0 tel: URIs and compact birthdays', () => {
    const r = parseVcf(
      'BEGIN:VCARD\nVERSION:4.0\nFN:Ann\nTEL;VALUE=uri;TYPE="voice,cell":tel:+254-712-345-678\nBDAY:19900412\nEND:VCARD\n',
    );
    expect(r.cards[0]).toMatchObject({
      displayName: 'Ann',
      birthday: '1990-04-12',
      phones: [{ raw: '+254-712-345-678', label: 'mobile' }],
    });
  });

  it('keeps going through many cards, skipping nothing it can use', () => {
    const one = (i: number) =>
      `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Person ${i}\r\nTEL:07${String(i).padStart(8, '0')}\r\nEND:VCARD\r\n`;
    const r = parseVcf(Array.from({ length: 468 }, (_, i) => one(i)).join(''));
    expect(r.cardCount).toBe(468);
    expect(r.cards[467].displayName).toBe('Person 467');
  });

  it('drops what it cannot use and counts it, without failing the card', () => {
    const r = parseVcf(
      [
        'BEGIN:VCARD',
        'FN:Kim',
        'EMAIL:not an email',
        'EMAIL:kim@example.com',
        'EMAIL:KIM@example.com',
        'TEL:0712345678',
        'TEL:0712 345 678',
        'BDAY:--0412',
        'BDAY:2999-01-01',
        `NOTE:${'x'.repeat(10_050)}`,
        'END:VCARD',
      ].join('\n'),
    );
    expect(r.cards[0].emails).toEqual([
      { address: 'kim@example.com', label: undefined },
    ]);
    expect(r.cards[0].phones).toHaveLength(1); // same digits once
    expect(r.cards[0].birthday).toBeUndefined();
    expect(r.cards[0].notes).toHaveLength(10_000);
    expect(r.warnings).toEqual({
      invalidEmails: 1,
      tooManyValues: 0,
      truncatedFields: 1,
      unusableBirthdays: 2,
    });
  });

  it('ignores text outside cards, a byte-order mark and unknown properties', () => {
    const r = parseVcf(
      '﻿junk\nBEGIN:VCARD\nX-SOCIAL:whatever\nFN:A\nEND:VCARD\nmore junk',
    );
    expect(r.cardCount).toBe(1);
    expect(r.cards[0].displayName).toBe('A');
  });

  it('returns nothing for a file that is not a vCard', () => {
    expect(parseVcf('name,phone\nAnn,0712').cardCount).toBe(0);
  });
});

describe('CATEGORIES (groups and labels)', () => {
  it('keeps real groups and drops the ones phones add to everyone', () => {
    const { cards } = parseVcf(
      crlf(`
    BEGIN:VCARD
    VERSION:3.0
    FN:Otieno
    CATEGORIES:myContacts,Plumbers,* starred,Church\\, Kasarani
    CATEGORIES:System Group: My Contacts,Imported on 5/3,Chama
    END:VCARD
    BEGIN:VCARD
    VERSION:3.0
    FN:Kamau
    CATEGORIES:My Contacts,Starred in Android
    END:VCARD`),
    );
    expect(cards[0].categories).toEqual([
      'Plumbers',
      'Church, Kasarani',
      'Chama',
    ]);
    expect(cards[1].categories).toBeUndefined();
  });
});

describe('writeVcard', () => {
  it('escapes backslashes, commas, semicolons and newlines', () => {
    const text = writeVcard({
      displayName: 'a\\b, c; d\ne',
      givenName: null,
      familyName: null,
      nickname: null,
      organization: null,
      jobTitle: null,
      notes: null,
      birthday: null,
      phones: [],
      emails: [],
    });
    expect(text).toContain('FN:a\\\\b\\, c\\; d\\ne\r\n');
  });

  it('round-trips through the parser', () => {
    const text = writeVcard({
      displayName: 'Mama; Njeri, "Senior"',
      givenName: 'Njeri',
      familyName: 'Kamau',
      nickname: 'Mama',
      organization: 'St. Andrew’s',
      jobTitle: null,
      notes: `Line 1\nLine 2 with a long tail ${'é'.repeat(100)}`,
      birthday: '1960-01-31',
      tags: ['chama, treasurer', 'church'],
      phones: [
        { raw: '0712 345 678', e164: '+254712345678', label: 'mobile' },
        { raw: '*144#', e164: null, label: null },
      ],
      emails: [{ address: 'njeri@example.com', label: 'home' }],
    });
    expect(text.split('\r\n').every((l) => [...l].length <= 75)).toBe(true);
    expect(parseVcf(text).cards[0]).toEqual({
      displayName: 'Mama; Njeri, "Senior"',
      givenName: 'Njeri',
      familyName: 'Kamau',
      nickname: 'Mama',
      organization: 'St. Andrew’s',
      notes: `Line 1\nLine 2 with a long tail ${'é'.repeat(100)}`,
      birthday: '1960-01-31',
      categories: ['chama, treasurer', 'church'],
      phones: [
        { raw: '+254712345678', label: 'mobile' },
        { raw: '*144#', label: undefined },
      ],
      emails: [{ address: 'njeri@example.com', label: 'home' }],
    });
  });
});
