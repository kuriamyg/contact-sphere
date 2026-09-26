import {
  addDays,
  daysBetween,
  keepInTouchDue,
  nairobiToday,
  nextBirthday,
} from './dates';

describe('reminder dates (Nairobi)', () => {
  it('knows the Nairobi day, which starts at 21:00 UTC', () => {
    expect(nairobiToday(new Date('2026-09-26T20:59:59Z'))).toBe('2026-09-26');
    expect(nairobiToday(new Date('2026-09-26T21:00:00Z'))).toBe('2026-09-27');
  });

  it('counts days across months and years', () => {
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(daysBetween('2027-01-02', '2026-12-30')).toBe(-3);
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
  });

  it('finds the next birthday, today included, with the age turned', () => {
    expect(nextBirthday('1990-09-26', '2026-09-26')).toEqual({
      on: '2026-09-26',
      daysAway: 0,
      turning: 36,
    });
    expect(nextBirthday('1990-09-25', '2026-09-26')).toEqual({
      on: '2027-09-25',
      daysAway: 364,
      turning: 37,
    });
    expect(nextBirthday('1985-01-03', '2026-12-30')).toMatchObject({
      on: '2027-01-03',
      daysAway: 4,
    });
  });

  it('keeps 29 February birthdays on 28 February in other years', () => {
    expect(nextBirthday('2000-02-29', '2027-02-01').on).toBe('2027-02-28');
    expect(nextBirthday('2000-02-29', '2028-02-01').on).toBe('2028-02-29');
  });

  it('says when keeping in touch is due, and how overdue', () => {
    expect(
      keepInTouchDue(14, '2026-09-01', '2026-01-01', '2026-09-26'),
    ).toEqual({ dueOn: '2026-09-15', overdueDays: 11 });
    expect(keepInTouchDue(30, null, '2026-09-20', '2026-09-26')).toEqual({
      dueOn: '2026-10-20',
      overdueDays: -24,
    });
  });
});
