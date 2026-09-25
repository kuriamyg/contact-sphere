import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';

export const IS_PUBLIC = 'auth:isPublic';
export const BFF_EXEMPT = 'auth:bffExempt';

/** No session needed (login, setup, health). The web-server secret still is. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/**
 * Callable without the web-server secret. ONLY for health checks, which
 * platforms and uptime monitors call directly. Never for data.
 */
export const BffExempt = () => SetMetadata(BFF_EXEMPT, true);

export interface AuthContext {
  userId: string;
  sessionId: string;
}

export type AuthedRequest = Request & { auth?: AuthContext };

/** The signed-in user's ids, set by SessionGuard. */
export const CurrentAuth = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthContext => {
    const auth = ctx.switchToHttp().getRequest<AuthedRequest>().auth;
    if (!auth) throw new Error('CurrentAuth used on a route without a session');
    return auth;
  },
);
