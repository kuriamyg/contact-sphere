import { describe, expect, it } from 'vitest';

import { formatDay, whatsappHref } from '@/lib/format';

describe('reminder formatting', () => {
  it('writes a calendar day the Kenyan way, whatever the server time zone', () => {
    expect(formatDay('2026-10-03')).toBe('Sat, 3 Oct');
  });

  it('opens WhatsApp with a ready message when given one', () => {
    expect(whatsappHref('+254712345678')).toBe('https://wa.me/254712345678');
    expect(whatsappHref('+254712345678', 'Happy birthday, Ann! 🎉')).toBe(
      'https://wa.me/254712345678?text=Happy%20birthday%2C%20Ann!%20%F0%9F%8E%89',
    );
  });
});
