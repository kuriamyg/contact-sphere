import { describe, expect, it } from 'vitest';

import { countCards, stripBinaryProperties } from '@/lib/vcf-file';

describe('stripBinaryProperties', () => {
  it('removes folded 3.0 photos and keeps everything else', () => {
    const vcf = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:Ann',
      'PHOTO;ENCODING=b;TYPE=JPEG:/9j/4AAQSkZJRg',
      ' ABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgK',
      ' DBQNDAsLDBkSEw8UHRofHh0aHBwgJC4n',
      'TEL:0712 345 678',
      'item1.PHOTO:https://example.com/a.jpg',
      'END:VCARD',
    ].join('\r\n');
    expect(stripBinaryProperties(vcf)).toBe(
      [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'FN:Ann',
        'TEL:0712 345 678',
        'END:VCARD',
      ].join('\n'),
    );
  });

  it('removes 2.1 photos whose base64 continues on unindented lines', () => {
    const vcf = [
      'BEGIN:VCARD',
      'VERSION:2.1',
      'N:Wanjiru;Ann;;;',
      'PHOTO;ENCODING=BASE64;JPEG:/9j/4AAQSkZJRgABAQAAAQABAAD',
      '/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwg',
      'JC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL',
      '',
      'TEL;CELL:0712345678',
      'END:VCARD',
    ].join('\n');
    const out = stripBinaryProperties(vcf);
    expect(out).not.toMatch(/9j|2wBD|JC4n/);
    expect(out).toContain('N:Wanjiru;Ann;;;');
    expect(out).toContain('TEL;CELL:0712345678');
  });

  it('shrinks a photo-heavy file dramatically', () => {
    const photo =
      'PHOTO;ENCODING=b;TYPE=JPEG:' +
      'A'.repeat(74) +
      ('\r\n ' + 'A'.repeat(74)).repeat(300);
    const card = (i: number) =>
      `BEGIN:VCARD\r\nFN:P${i}\r\n${photo}\r\nTEL:07${i}\r\nEND:VCARD`;
    const big = Array.from({ length: 468 }, (_, i) => card(i)).join('\r\n');
    const small = stripBinaryProperties(big);
    expect(big.length).toBeGreaterThan(10_000_000);
    expect(small.length).toBeLessThan(40_000);
    expect(countCards(small)).toBe(468);
  });
});
