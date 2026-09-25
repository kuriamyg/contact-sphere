import { LOGIN_FAILURE_WINDOW_MS, LOGIN_FAILURES_MAX } from './auth.constants';
import { LoginFailures } from './login-failures';

describe('LoginFailures', () => {
  it(`locks an account after ${LOGIN_FAILURES_MAX} failures in the window`, () => {
    const f = new LoginFailures();
    for (let i = 0; i < LOGIN_FAILURES_MAX - 1; i++) f.record('k', 1000);
    expect(f.isLocked('k', 1000)).toBe(false);
    f.record('k', 1000);
    expect(f.isLocked('k', 1000)).toBe(true);
  });

  it('unlocks once the window has passed', () => {
    const f = new LoginFailures();
    for (let i = 0; i < LOGIN_FAILURES_MAX; i++) f.record('k', 0);
    expect(f.isLocked('k', LOGIN_FAILURE_WINDOW_MS)).toBe(false);
  });

  it('is cleared by a successful login and is per account', () => {
    const f = new LoginFailures();
    for (let i = 0; i < LOGIN_FAILURES_MAX; i++) f.record('a', 0);
    expect(f.isLocked('b', 0)).toBe(false);
    f.clear('a');
    expect(f.isLocked('a', 0)).toBe(false);
  });
});
