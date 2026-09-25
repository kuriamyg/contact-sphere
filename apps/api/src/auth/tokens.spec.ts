import { hashToken, newSessionToken, secretsEqual } from './tokens';

describe('session tokens', () => {
  it('are 256-bit, URL-safe and unique', () => {
    const a = newSessionToken();
    const b = newSessionToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it('are stored only as a 64-char hex SHA-256 digest', () => {
    const token = newSessionToken();
    const hash = hashToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashToken(token)).toBe(hash);
  });
});

describe('secretsEqual', () => {
  it('matches equal secrets and rejects different ones of any length', () => {
    expect(secretsEqual('same-secret', 'same-secret')).toBe(true);
    expect(secretsEqual('same-secret', 'same-secreT')).toBe(false);
    expect(secretsEqual('short', 'a-much-longer-secret')).toBe(false);
    expect(secretsEqual('', 'x')).toBe(false);
  });
});
