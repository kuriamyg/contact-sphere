import { Injectable } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  SESSION_ABSOLUTE_MS,
  SESSION_IDLE_MS,
  SESSION_TOUCH_MS,
} from './auth.constants';
import type { AuthContext } from './decorators';
import { hashToken, newSessionToken } from './tokens';

export interface IssuedSession {
  /** Returned ONCE, to the web server, which puts it in an HttpOnly cookie. */
  token: string;
  expiresAt: Date;
}

type Db = PrismaService | Prisma.TransactionClient;

export interface SessionView {
  id: string;
  /** "Chrome on Android", or null when the browser did not say. */
  device: string | null;
  createdAt: string;
  lastSeenAt: string;
}

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    now = new Date(),
    db: Db = this.prisma,
    device: string | null = null,
  ): Promise<IssuedSession> {
    const token = newSessionToken();
    const expiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_MS);
    await db.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        createdAt: now,
        lastSeenAt: now,
        expiresAt,
        device,
      },
    });
    return { token, expiresAt };
  }

  /** Resolves a token to its user, or null. Expired sessions are deleted. */
  async authenticate(
    token: string,
    now = new Date(),
  ): Promise<AuthContext | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, userId: true, lastSeenAt: true, expiresAt: true },
    });
    if (!session) return null;

    const idleExpired =
      now.getTime() - session.lastSeenAt.getTime() > SESSION_IDLE_MS;
    if (session.expiresAt <= now || idleExpired) {
      await this.prisma.session.deleteMany({ where: { id: session.id } });
      return null;
    }

    if (now.getTime() - session.lastSeenAt.getTime() > SESSION_TOUCH_MS) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { lastSeenAt: now },
      });
    }
    return { userId: session.userId, sessionId: session.id };
  }

  /** The owner's signed-in devices, most recently used first. */
  async list(userId: string, now = new Date()): Promise<SessionView[]> {
    const rows = await this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: now },
        lastSeenAt: { gt: new Date(now.getTime() - SESSION_IDLE_MS) },
      },
      orderBy: { lastSeenAt: 'desc' },
      select: { id: true, device: true, createdAt: true, lastSeenAt: true },
    });
    return rows.map((r) => ({
      id: r.id,
      device: r.device,
      createdAt: r.createdAt.toISOString(),
      lastSeenAt: r.lastSeenAt.toISOString(),
    }));
  }

  /** Ends one of the owner's sessions; false if it is not theirs. */
  async revokeOwn(userId: string, sessionId: string): Promise<boolean> {
    const { count } = await this.prisma.session.deleteMany({
      where: { id: sessionId, userId },
    });
    return count > 0;
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }

  /** Signs the user out everywhere, optionally keeping one session. */
  async revokeAll(
    userId: string,
    exceptSessionId?: string,
    db: Db = this.prisma,
  ): Promise<number> {
    const { count } = await db.session.deleteMany({
      where: {
        userId,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
    });
    return count;
  }
}
