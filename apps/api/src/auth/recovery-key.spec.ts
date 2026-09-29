import {
  hashRecoveryKey,
  newRecoveryKey,
  normaliseRecoveryKey,
} from './recovery-key';

describe('recovery keys (ADR 0021)', () => {
  it('are 16 unambiguous characters in groups of four, never repeated', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const key = newRecoveryKey();
      expect(key).toMatch(/^[2-9A-HJ-NP-Z]{4}(-[2-9A-HJ-NP-Z]{4}){3}$/);
      keys.add(key);
    }
    expect(keys.size).toBe(200);
  });

  it('are read however they were typed', () => {
    expect(normaliseRecoveryKey(' 7kqm 2wxd-hb9r4tfn ')).toBe(
      '7KQM2WXDHB9R4TFN',
    );
    expect(hashRecoveryKey('7kqm 2wxd hb9r 4tfn')).toBe(
      hashRecoveryKey('7KQM-2WXD-HB9R-4TFN'),
    );
  });

  it('refuse what cannot be a key', () => {
    for (const bad of [
      '',
      '7KQM-2WXD',
      '0OI1-2WXD-HB9R-4TFN',
      '1'.repeat(16),
    ]) {
      expect(normaliseRecoveryKey(bad)).toBeNull();
    }
  });

  it('hash to 64 hex characters that do not contain the key', () => {
    const hash = hashRecoveryKey('7KQM-2WXD-HB9R-4TFN');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash.toUpperCase()).not.toContain('7KQM2WXD');
  });
});
