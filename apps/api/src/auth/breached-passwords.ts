import { createHash } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';

import type { Env } from '../config/env';
import { ENV } from '../config/env.provider';

const RANGE_URL = 'https://api.pwnedpasswords.com/range/';
const TIMEOUT_MS = 3000;

export type FetchLike = (
  url: string,
  init: { headers: Record<string, string>; signal: AbortSignal },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

/**
 * "Has this password appeared in a known data breach?" (A5) through Have I
 * Been Pwned's range API. Only the first 5 hex characters of the password's
 * SHA-1 are sent; the answer is every breached hash starting with them
 * (padded with decoys so its size says nothing), compared here. The
 * password itself never leaves the server, and is never logged.
 *
 * Fails open: if the service is slow or down, the password is judged by
 * the length rules alone, so an outage never blocks changing a password.
 */
@Injectable()
export class BreachedPasswords {
  private readonly logger = new Logger(BreachedPasswords.name);
  /** Replaced in tests. */
  fetchFn: FetchLike = (url, init) => fetch(url, init);

  constructor(@Inject(ENV) private readonly env: Env) {}

  /** How often it was seen; 0 = not found; null = could not check. */
  async timesSeen(password: string): Promise<number | null> {
    if (!this.env.breachedPasswordCheck) return null;
    const sha1 = createHash('sha1')
      .update(password, 'utf8')
      .digest('hex')
      .toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    try {
      const res = await this.fetchFn(RANGE_URL + prefix, {
        headers: { 'add-padding': 'true', 'user-agent': 'contact-sphere' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        this.logger.warn(`Breach check unavailable (HTTP ${res.status})`);
        return null;
      }
      return countFor(await res.text(), suffix);
    } catch (err) {
      this.logger.warn(
        `Breach check unavailable (${(err as Error)?.name ?? 'error'})`,
      );
      return null;
    }
  }
}

/** Finds SUFFIX:COUNT in the range answer; padding lines count 0. */
export function countFor(body: string, suffix: string): number {
  for (const line of body.split('\n')) {
    const [s, n] = line.trim().split(':');
    if (s === suffix) return Number(n) || 0;
  }
  return 0;
}
