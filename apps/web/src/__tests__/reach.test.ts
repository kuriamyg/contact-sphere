import { describe, expect, it } from 'vitest';

import { batches, smsHref, smsSize } from '@/lib/sms-size';
import { cardVcf } from '@/lib/vcard-card';

describe('smsSize (mirrors the API)', () => {
  it('counts GSM and unicode parts', () => {
    expect(smsSize('a'.repeat(160)).parts).toBe(1);
    expect(smsSize('a'.repeat(161)).parts).toBe(2);
    expect(smsSize('Habari 🙂')).toMatchObject({
      encoding: 'unicode',
      parts: 1,
    });
    expect(smsSize('€').length).toBe(2);
  });
});

describe('group texting from the phone', () => {
  it('splits numbers into batches', () => {
    const nums = Array.from({ length: 45 }, (_, i) => `+2547000000${i}`);
    expect(batches(nums, 20).map((b) => b.length)).toEqual([20, 20, 5]);
  });

  it('builds Android and iPhone sms links with the text', () => {
    expect(smsHref(['+254711', '+254722'], 'Hi & bye', false)).toBe(
      'sms:+254711,+254722?body=Hi%20%26%20bye',
    );
    expect(smsHref(['+254711', '+254722'], 'Hi', true)).toBe(
      'sms://open?addresses=+254711,+254722&body=Hi',
    );
    expect(smsHref(['+254711'], '', false)).toBe('sms:+254711');
  });
});

describe('cardVcf', () => {
  const card = {
    displayName: 'Wanjiru Kamau',
    givenName: 'Wanjiru',
    familyName: 'Kamau',
    organization: 'Mama Mboga, Ltd; Kasarani',
    jobTitle: null,
    phones: [
      { raw: '0712 345 678', e164: '+254712345678', label: 'mobile' },
      { raw: '020 123', e164: null, label: 'office' },
    ],
    emails: [{ address: 'w@example.com', label: 'work' }],
  };

  it('holds only name, work, numbers and emails, escaped', () => {
    expect(cardVcf(card).split('\r\n')).toEqual([
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Kamau;Wanjiru;;;',
      'FN:Wanjiru Kamau',
      'ORG:Mama Mboga\\, Ltd\\; Kasarani',
      'TEL;TYPE=CELL:+254712345678',
      'TEL:020123',
      'EMAIL;TYPE=WORK:w@example.com',
      'END:VCARD',
    ]);
  });

  it('keeps the QR small: at most 3 numbers and 2 emails', () => {
    const many = {
      ...card,
      phones: Array.from({ length: 6 }, (_, i) => ({
        raw: `07${i}`,
        e164: null,
        label: null,
      })),
      emails: Array.from({ length: 4 }, (_, i) => ({
        address: `${i}@x.com`,
        label: null,
      })),
    };
    const v = cardVcf(many);
    expect(v.match(/^TEL/gm)).toHaveLength(3);
    expect(v.match(/^EMAIL/gm)).toHaveLength(2);
  });

  it('uses the display name when there are no name parts', () => {
    expect(
      cardVcf({
        ...card,
        givenName: null,
        familyName: null,
        displayName: 'Mama Mboga',
      }),
    ).toContain('N:;Mama Mboga;;;');
  });
});
