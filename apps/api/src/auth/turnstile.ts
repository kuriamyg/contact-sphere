import { Logger } from '@nestjs/common';

import type { TurnstileConfig } from '../config/env';

/**
 * "Are you a person?" for sign-up (C3): Cloudflare Turnstile. The web page
 * shows Cloudflare's widget, which hands the form a one-use token; the API
 * asks Cloudflare whether that token is good.
 */
export interface HumanCheck {
  /** True: a person. False: refused or missing. */
  verify(token: string | undefined): Promise<boolean>;
}

export const HUMAN_CHECK = Symbol('HUMAN_CHECK');

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export class CloudflareTurnstile implements HumanCheck {
  private readonly logger = new Logger('Turnstile');
  constructor(
    private readonly secret: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async verify(token: string | undefined): Promise<boolean> {
    if (!token || token.length > 2048) return false;
    try {
      const res = await this.fetchImpl(SITEVERIFY, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: this.secret, response: token }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { success?: unknown };
      return data.success === true;
    } catch (e) {
      // Cloudflare unreachable: let the person through rather than block
      // every sign-up; the per-address rate limit still applies. (As the
      // breached-password check does, ADR 0016.)
      this.logger.warn(
        `Turnstile unavailable, allowing: ${e instanceof Error ? e.message : 'error'}`,
      );
      return true;
    }
  }
}

/** Tests only: the token "pass" is a person. */
export class FakeTurnstile implements HumanCheck {
  verify(token: string | undefined): Promise<boolean> {
    return Promise.resolve(token === 'pass');
  }
}

export function humanCheckFor(
  cfg: TurnstileConfig | undefined,
): HumanCheck | null {
  if (!cfg) return null;
  return cfg.provider === 'fake'
    ? new FakeTurnstile()
    : new CloudflareTurnstile(cfg.secret);
}
