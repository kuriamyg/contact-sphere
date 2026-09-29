import { describe, expect, it } from 'vitest';

import { backupDue, snoozed } from '@/lib/backup-reminder';

const NOW = Date.parse('2026-09-29T07:00:00Z');
const DAY = 86_400_000;
const ago = (d: number) => new Date(NOW - d * DAY).toISOString();

describe('backup reminder (C2)', () => {
  it('waits for 10 contacts and a few days', () => {
    expect(backupDue({ createdAt: ago(40) }, 9, NOW)).toBeNull();
    expect(backupDue({ createdAt: ago(1) }, 50, NOW)).toBeNull();
    expect(backupDue({ createdAt: ago(3) }, 10, NOW)).toBe('never');
  });

  it('asks again a month after the last backup', () => {
    expect(
      backupDue({ createdAt: ago(90), lastBackupAt: ago(29) }, 50, NOW),
    ).toBeNull();
    expect(
      backupDue({ createdAt: ago(90), lastBackupAt: ago(30) }, 50, NOW),
    ).toBe('old');
  });

  it('"Not now" lasts 30 days', () => {
    expect(snoozed(null, NOW)).toBe(false);
    expect(snoozed('garbage', NOW)).toBe(false);
    expect(snoozed(String(NOW - 29 * DAY), NOW)).toBe(true);
    expect(snoozed(String(NOW - 30 * DAY), NOW)).toBe(false);
  });
});
