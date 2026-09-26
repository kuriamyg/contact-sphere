import { Inject, Injectable } from '@nestjs/common';
import webpush from 'web-push';

import type { Env } from '../config/env';
import { ENV } from '../config/env.provider';

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushMessage {
  title: string;
  body: string;
  /** Opened when the notification is tapped. Always a path in the app. */
  url: string;
  tag: string;
}

/** What happened to one delivery. `gone` = the phone unsubscribed. */
export type PushOutcome = 'sent' | 'gone' | 'failed';

/**
 * Web Push with VAPID. The payload is encrypted to the phone's keys, so
 * the browser vendor's push service (Google, Apple, Mozilla) carries it
 * without being able to read it.
 */
@Injectable()
export class PushService {
  constructor(@Inject(ENV) private readonly env: Env) {}

  get enabled(): boolean {
    return !!this.env.push;
  }

  get publicKey(): string | null {
    return this.env.push?.publicKey ?? null;
  }

  async deliver(target: PushTarget, msg: PushMessage): Promise<PushOutcome> {
    const push = this.env.push;
    if (!push) return 'failed';
    try {
      await webpush.sendNotification(
        {
          endpoint: target.endpoint,
          keys: { p256dh: target.p256dh, auth: target.auth },
        },
        JSON.stringify(msg),
        {
          vapidDetails: {
            subject: push.subject,
            publicKey: push.publicKey,
            privateKey: push.privateKey,
          },
          // A morning reminder is stale by evening.
          TTL: 12 * 60 * 60,
          timeout: 10_000,
        },
      );
      return 'sent';
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      return status === 404 || status === 410 ? 'gone' : 'failed';
    }
  }
}
