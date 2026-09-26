import { conflicts, mergeContacts, type MergeSide } from './merge';

const side = (over: Partial<MergeSide>): MergeSide => ({
  displayName: 'X',
  givenName: null,
  familyName: null,
  nickname: null,
  organization: null,
  jobTitle: null,
  birthday: null,
  area: null,
  metThrough: null,
  notes: null,
  tags: [],
  phones: [],
  emails: [],
  ...over,
});
const phone = (
  raw: string,
  e164: string | null,
  label: string | null = null,
) => ({
  raw,
  e164,
  digits: raw.replace(/\D/g, ''),
  label,
});

describe('merge', () => {
  const keep = side({
    displayName: 'Ann Wanjiru',
    givenName: 'Ann',
    familyName: 'Wanjiru',
    organization: 'Safaricom',
    notes: 'Met at church',
    phones: [phone('0712 345 678', '+254712345678', 'mobile')],
    emails: [{ address: 'ann@x.co', label: null }],
  });
  const other = side({
    displayName: 'Mama Njeri',
    givenName: 'Ann',
    nickname: 'Mama Njeri',
    organization: 'KCB',
    birthday: '1990-04-12',
    notes: 'Likes tea',
    phones: [
      phone('+254 712 345 678', '+254712345678'),
      phone('0733 111 222', '+254733111222', 'work'),
    ],
    emails: [
      { address: 'ann@x.co', label: 'home' },
      { address: 'njeri@y.co', label: null },
    ],
  });

  it('lists only fields where both have different values', () => {
    expect(conflicts(keep, other)).toEqual([
      { field: 'displayName', keep: 'Ann Wanjiru', merge: 'Mama Njeri' },
      { field: 'organization', keep: 'Safaricom', merge: 'KCB' },
    ]);
  });

  it('keeps the survivor’s values by default, fills gaps, combines everything else', () => {
    const r = mergeContacts(keep, other);
    expect(r).toMatchObject({
      displayName: 'Ann Wanjiru',
      organization: 'Safaricom',
      familyName: 'Wanjiru',
      nickname: 'Mama Njeri', // gap filled
      birthday: '1990-04-12', // gap filled
      notes: 'Met at church\n\nLikes tea',
    });
    expect(r.phones.map((p) => p.raw)).toEqual([
      '0712 345 678',
      '0733 111 222',
    ]);
    expect(r.emails.map((e) => e.address)).toEqual(['ann@x.co', 'njeri@y.co']);
  });

  it('takes the other value where the owner chose it', () => {
    const r = mergeContacts(keep, other, { organization: 'merge' });
    expect(r.organization).toBe('KCB');
    expect(r.displayName).toBe('Ann Wanjiru');
  });

  it('does not repeat identical notes, and caps lists at 20', () => {
    const many = (n: number, prefix: string) =>
      Array.from({ length: n }, (_, i) =>
        phone(`07${prefix}${String(i).padStart(7, '0')}`, null),
      );
    const r = mergeContacts(
      side({ notes: 'same', phones: many(15, '1') }),
      side({ notes: ' same ', phones: many(15, '2') }),
    );
    expect(r.notes).toBe('same');
    expect(r.phones).toHaveLength(20);
  });

  it('keeps every tag from both, without repeats', () => {
    const r = mergeContacts(
      side({ tags: ['plumber', 'church'] }),
      side({ tags: ['church', 'electrician'], area: 'Kasarani' }),
    );
    expect(r.tags).toEqual(['plumber', 'church', 'electrician']);
    expect(r.area).toBe('Kasarani');
  });
});
