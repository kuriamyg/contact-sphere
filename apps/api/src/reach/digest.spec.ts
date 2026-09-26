import type { TodayView } from '../remember/remember.service';
import { digestText } from './reach.service';

const base: TodayView = {
  today: '2026-09-26',
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
