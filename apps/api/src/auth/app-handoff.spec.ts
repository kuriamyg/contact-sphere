import { BASE64URL_43, challengeOf } from './app-handoff';

describe('app sign-in hand-off', () => {
  it('uses the PKCE S256 transform (RFC 7636 appendix B)', () => {
    expect(challengeOf('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
    expect(BASE64URL_43.test(challengeOf('x'.repeat(43)))).toBe(true);
  });
});
