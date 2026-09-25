import { randomBytes } from 'node:crypto';

import { open, seal } from './secret-box';

const key = randomBytes(32);

describe('secret box (AES-256-GCM)', () => {
  it('round-trips and never contains the plaintext', () => {
    const sealed = seal('JBSWY3DPEHPK3PXP', key);
    expect(sealed.startsWith('v1:')).toBe(true);
    expect(sealed).not.toContain('JBSWY3DPEHPK3PXP');
    expect(open(sealed, key)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('uses a fresh nonce: same input, different output', () => {
    expect(seal('same', key)).not.toBe(seal('same', key));
  });

  it('refuses a tampered value instead of returning garbage', () => {
    const sealed = seal('secret', key);
    const bytes = Buffer.from(sealed.slice(3), 'base64');
    bytes[bytes.length - 1] ^= 1;
    expect(() => open('v1:' + bytes.toString('base64'), key)).toThrow();
  });

  it('refuses the wrong key', () => {
    expect(() => open(seal('secret', key), randomBytes(32))).toThrow();
  });
});
