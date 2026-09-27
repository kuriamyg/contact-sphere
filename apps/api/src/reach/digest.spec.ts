import type { TodayView } from '../remember/remember.service';
import { digestText } from './reach.service';

const base: TodayView = {
  today: '2026-09-26',
  setup: { contacts: 0, birthdays: 0, keepInTouch: 0 },
  followUps: [],
  keepInTouch: [],
  birthdays: [],
};
const f = (daysAway: number) =>
  ({ daysAway }) as unknown as TodayView['followUps'][0];

describe('digestText', () => {
  it('says nothing when nothing is due today', () => {
    expect(digestText(base)).toBeNull();
    expect(
      digestText({
        ...base,
        followUps: [f(2)],
        birthdays: [{ daysAway: 3 } as TodayView['birthdays'][0]],
      }),
    ).toBeNull();
  });

  it('counts what is due without naming anyone', () => {
    expect(
      digestText({
        ...base,
        followUps: [f(0), f(-2), f(4)],
        birthdays: [{ daysAway: 0 } as TodayView['birthdays'][0]],
        keepInTouch: [{} as TodayView['keepInTouch'][0]],
      }),
    ).toBe(
      'Today: 2 follow-ups, 1 birthday and 1 person to keep in touch with.',
    );
    expect(digestText({ ...base, followUps: [f(0)] })).toBe(
      'Today: 1 follow-up.',
    );
  });
});

describe('digestText in Kiswahili', () => {
  it('says the same counts, in Kiswahili, still naming no one', () => {
    expect(
      digestText(
        {
          ...base,
          followUps: [f(0), f(-1)],
          birthdays: [{ daysAway: 0 } as TodayView['birthdays'][0]],
          keepInTouch: [
            {} as TodayView['keepInTouch'][0],
            {} as TodayView['keepInTouch'][0],
          ],
        },
        'sw',
      ),
    ).toBe(
      'Leo: ufuatiliaji 2, siku 1 ya kuzaliwa na watu 2 wa kuwasiliana nao.',
    );
    expect(
      digestText(
        { ...base, keepInTouch: [{} as TodayView['keepInTouch'][0]] },
        'sw',
      ),
    ).toBe('Leo: mtu 1 wa kuwasiliana naye.');
  });
});
