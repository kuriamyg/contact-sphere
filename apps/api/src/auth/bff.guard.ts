import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import type { Env } from '../config/env';
import { ENV } from '../config/env.provider';
import { BFF_SECRET_HEADER } from './auth.constants';
import { BFF_EXEMPT } from './decorators';
import { secretsEqual } from './tokens';

/**
 * First gate: is the caller our web app's server? (ADR 0006)
 *
 * Browsers never call the API; the web server does, adding a shared secret.
 * Everything else — rate limiting by client IP, session cookies staying
 * first-party — rests on this, so it runs before any other guard.
 */
@Injectable()
export class BffGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ENV) private readonly env: Env,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const exempt = this.reflector.getAllAndOverride<boolean>(BFF_EXEMPT, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (exempt) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const sent = req.headers[BFF_SECRET_HEADER];
    if (
      typeof sent === 'string' &&
      secretsEqual(sent, this.env.apiSharedSecret)
    ) {
      return true;
    }
    throw new ForbiddenException();
  }
}
