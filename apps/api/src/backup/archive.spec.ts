import { ArchiveError, readArchive } from './archive';

const base = { format: 'contact-sphere-archive', version: 1 };
const ID = '0191f000-0000-7000-8000-000000000001';

describe('readArchive (C2)', () => {
  it('refuses anything that is not an archive, or a newer one', () => {
    expect(() => readArchive(null)).toThrow(ArchiveError);
    expect(() => readArchive({ format: 'other', version: 1 })).toThrow(
      /not a Contact Sphere backup/,
    );
    expect(() => readArchive({ ...base, version: 2 })).toThrow(/newer/);
  });

  it('refuses a file too large to restore at once', () => {
    const contacts = Array.from({ length: 5001 }, () => ({}));
    expect(() => readArchive({ ...base, contacts })).toThrow(/too large/);
  });

  it('keeps only what the database accepts', () => {
    const { archive, unreadable } = readArchive({
      ...base,
      contacts: [
        {
          id: ID.toUpperCase(),
          displayName: '  Wanjiru   Kamau ',
          birthday: '1990-02-30',
          keepInTouchDays: 31,
          tags: ['Plumber', 7],
          emails: [{ address: ' Ann@Example.com ' }, { address: 'nope' }],
          phones: [{ raw: ' 0712 345 678 ', label: ' mobile ' }, { raw: '' }],
          lastContactedAt: 'yesterday',
          archived: 'yes',
        },
        { id: ID, displayName: '   ' },
      ],
      groups: [
        {
          name: ' Chama ',
          kind: 'mafia',
          members: [{ contactId: ID, role: ' Treasurer ' }],
        },
      ],
      followUps: [{ contactId: ID, dueOn: '1999-01-01', note: 'Old' }],
    });
    expect(archive.contacts).toEqual([
      expect.objectContaining({
        id: ID,
        displayName: 'Wanjiru Kamau',
        birthday: null,
        keepInTouchDays: null,
        tags: ['Plumber'],
        emails: [{ address: 'ann@example.com', label: null }],
        phones: [{ raw: '0712 345 678', label: 'mobile' }],
        lastContactedAt: null,
        archived: false,
      }),
    ]);
    expect(archive.groups).toEqual([
      {
        name: 'Chama',
        kind: 'other',
        description: null,
        members: [{ contactId: ID, role: 'treasurer' }],
      },
    ]);
    expect(archive.followUps).toEqual([]);
    expect(unreadable).toBe(2);
  });
});
