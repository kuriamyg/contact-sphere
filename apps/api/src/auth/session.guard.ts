import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SESSION_SCHEME } from './auth.constants';
import { type AuthedRequest, IS_PUBLIC } from './decorators';
import { SessionService } from './session.service';

/**
 * Every route requires a valid session unless marked @Public(). Secure by
 * default: a new endpoint someone forgets to annotate is protected, not open.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = bearer(req.headers.authorization);
    const auth = token ? await this.sessions.authenticate(token) : null;
    if (!auth) throw new UnauthorizedException();
    req.auth = auth;
    return true;
  }
}

function bearer(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  if (scheme !== SESSION_SCHEME || !value || value.length > 128) return null;
  return value;
}
