import { LOGIN_FAILURE_WINDOW_MS, LOGIN_FAILURES_MAX } from './auth.constants';

/**
 * Per-account failed-login counter, on top of the per-IP rate limit: an
 * attacker rotating IP addresses still cannot make more than
 * LOGIN_FAILURES_MAX guesses against one account per window.
 *
 * In memory, so it resets on restart and is per instance. With one instance
 * (Render free/starter) that is acceptable; before scaling out, move it to
 * the database or Redis (docs/backlog.md). Keys are hashed emails, so the map
 * holds no personal data in readable form.
 */
export class LoginFailures {
  private readonly failures = new Map<string, number[]>();

  isLocked(key: string, now = Date.now()): boolean {
    return this.recent(key, now).length >= LOGIN_FAILURES_MAX;
  }

  record(key: string, now = Date.now()): void {
    const list = this.recent(key, now);
    list.push(now);
    this.failures.set(key, list);
  }

  clear(key: string): void {
    this.failures.delete(key);
  }

  private recent(key: string, now: number): number[] {
    const list = (this.failures.get(key) ?? []).filter(
      (t) => now - t < LOGIN_FAILURE_WINDOW_MS,
    );
    if (list.length === 0) this.failures.delete(key);
    return list;
  }
}
