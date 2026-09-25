import {
  hashPassword,
  passwordProblem,
  verifyAgainstDummy,
  verifyPassword,
} from './password';

describe('passwordProblem', () => {
  const email = 'ann@example.com';

  it('accepts a long passphrase', () => {
    expect(passwordProblem('orange piano window cloud', email)).toBeNull();
  });

  it.each([
    ['too short', 'short-pass1', /at least 12/],
    ['too long', 'x'.repeat(129), /at most 128/],
    ['the email', 'ANN@example.com', /email/],
    ['one repeated character', 'aaaaaaaaaaaaaaaa', /repeated/],
  ])('refuses a password that is %s', (_, password, reason) => {
    expect(passwordProblem(password, email)).toMatch(reason);
  });
});

describe('argon2id hashing', () => {
  it('hashes with argon2id and verifies only the right password', async () => {
    const hash = await hashPassword('orange piano window cloud');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(
      verifyPassword(hash, 'orange piano window cloud'),
    ).resolves.toBe(true);
    await expect(
      verifyPassword(hash, 'orange piano window clouD'),
    ).resolves.toBe(false);
  });

  it('salts: the same password hashes differently each time', async () => {
    const [a, b] = await Promise.all([
      hashPassword('orange piano window cloud'),
      hashPassword('orange piano window cloud'),
    ]);
    expect(a).not.toBe(b);
  });

  it('treats a malformed stored hash as a failed check, not a crash', async () => {
    await expect(verifyPassword('not-a-hash', 'anything')).resolves.toBe(false);
  });

  it('the dummy check completes (used for unknown emails)', async () => {
    await expect(verifyAgainstDummy('anything')).resolves.toBeUndefined();
  });
});
