import {
  hashRecoveryCode,
  looksLikeRecoveryCode,
  newRecoveryCodes,
  newTotpSecret,
  TOTP_PERIOD,
  totpCodeAt,
  totpUri,
  verifyTotp,
} from './totp';

const secret = newTotpSecret();
const now = 1_790_000_000_000;
const step = Math.floor(now / 1000 / TOTP_PERIOD);

describe('TOTP', () => {
  it('generates a 160-bit base32 secret', () => {
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  });

  it('builds an otpauth URI authenticator apps accept', () => {
    const uri = totpUri(secret, 'ann@example.com');
    expect(uri).toMatch(
      /^otpauth:\/\/totp\/Contact%20Sphere:ann%40example\.com\?/,
    );
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain('period=30');
    expect(uri).toContain('digits=6');
  });

  it('accepts the current code and returns its step', () => {
    expect(verifyTotp(secret, totpCodeAt(secret, now), null, now)).toBe(step);
  });

  it('tolerates one step of clock drift either way, not two', () => {
    const drift = (s: number) => now + s * TOTP_PERIOD * 1000;
    expect(verifyTotp(secret, totpCodeAt(secret, drift(-1)), null, now)).toBe(
      step - 1,
    );
    expect(verifyTotp(secret, totpCodeAt(secret, drift(1)), null, now)).toBe(
      step + 1,
    );
    expect(
      verifyTotp(secret, totpCodeAt(secret, drift(-2)), null, now),
    ).toBeNull();
  });

  it('refuses a code whose step was already used (replay)', () => {
    const code = totpCodeAt(secret, now);
    expect(verifyTotp(secret, code, BigInt(step), now)).toBeNull();
    expect(verifyTotp(secret, code, BigInt(step - 1), now)).toBe(step);
  });

  it('refuses malformed and wrong codes', () => {
    expect(verifyTotp(secret, '12345', null, now)).toBeNull();
    expect(verifyTotp(secret, 'abcdef', null, now)).toBeNull();
    const right = totpCodeAt(secret, now);
    const wrong = String((Number(right) + 1) % 1_000_000).padStart(6, '0');
    expect(verifyTotp(secret, wrong, null, now)).toBeNull();
  });
});

describe('recovery codes', () => {
  it('are 10 unique, readable codes without confusable characters', () => {
    const codes = newRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) {
      expect(c).toMatch(
        /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/,
      );
      expect(looksLikeRecoveryCode(c)).toBe(true);
    }
  });

  it('hash the same regardless of case and dashes', () => {
    expect(hashRecoveryCode('k7qm-2xpa-9trd')).toBe(
      hashRecoveryCode('K7QM2XPA9TRD'),
    );
  });
});
