import { describe, expect, it } from 'vitest';

import { dismissKey, planNotice } from '@/lib/plan-notice';

// 29 Sep 2026, 10:00 in Nairobi.
const NOW = Date.parse('2026-09-29T07:00:00Z');
const at = (iso: string) => ({ plusUntil: iso, paidPlus: false });

describe('planNotice (C1)', () => {
  it('says nothing to the operator, or without Plus', () => {
    expect(
      planNotice({ operator: true, plusUntil: '2026-10-01T09:00:00Z' }, NOW),
    ).toBeNull();
    expect(planNotice({ plusUntil: null }, NOW)).toBeNull();
  });

  it('warns 5 Nairobi days ahead, counting calendar days', () => {
    expect(planNotice(at('2026-10-05T09:00:00Z'), NOW)).toBeNull();
    expect(planNotice(at('2026-10-04T09:00:00Z'), NOW)).toMatchObject({
      kind: 'ending',
      daysLeft: 5,
    });
    // 23:30 tonight in Nairobi is still today.
    expect(planNotice(at('2026-09-29T20:30:00Z'), NOW)).toMatchObject({
      kind: 'ending',
      daysLeft: 0,
    });
    // 00:30 tomorrow in Nairobi is tomorrow.
    expect(planNotice(at('2026-09-29T21:30:00Z'), NOW)).toMatchObject({
      daysLeft: 1,
    });
  });

  it('knows a paying member from a trial', () => {
    expect(
      planNotice({ plusUntil: '2026-10-01T09:00:00Z', paidPlus: true }, NOW),
    ).toMatchObject({ kind: 'ending', paid: true });
  });

  it('mentions the end for 14 days, then stops', () => {
    expect(planNotice(at('2026-09-20T09:00:00Z'), NOW)).toMatchObject({
      kind: 'ended',
    });
    expect(planNotice(at('2026-09-10T09:00:00Z'), NOW)).toBeNull();
  });

  it('dismisses for one Nairobi day, per notice', () => {
    const n = planNotice(at('2026-10-01T09:00:00Z'), NOW)!;
    const today = dismissKey('u1', n, NOW);
    expect(dismissKey('u1', n, NOW + 3600_000)).toBe(today);
    expect(dismissKey('u1', n, NOW + 24 * 3600_000)).not.toBe(today);
    expect(dismissKey('u2', n, NOW)).not.toBe(today);
  });
});
