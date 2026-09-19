import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type AuthenticatedRequest } from '@claw/shared-types';
import { verifyUserAccessToken } from '@claw/shared-utilities';

import { IS_PUBLIC_KEY } from './decorators';
import { isSessionRevoked } from './session-revocation';

/**
 * Refuses an access token whose session was revoked (TD-033).
 *
 * A signed token is not read from the database, so after a logout — or after
 * a family was revoked for token theft — it kept working for up to
 * `JWT_ACCESS_EXPIRY`. auth-service now writes every revoked session to Redis
 * with that same lifetime, and this asks.
 *
 * It is a **second** global guard, registered after each service's own
 * AuthGuard, because thirteen services carry their own copy of that guard and
 * none of them reads `sessionId`. One guard registered once per service is
 * the whole change; the copies stay as they are.
 *
 * It only ever refuses. Anything it cannot read — no header, a token of
 * another shape (an ops token), no `JWT_SECRET` — it passes through, because
 * the service's own AuthGuard has already decided that case.
 */
@Injectable()
export class SessionRevocationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers?.authorization;
    const secret = process.env['JWT_SECRET'];
    if (!header?.startsWith('Bearer ') || !secret) {
      return true;
    }

    let sessionId: string;
    try {
      sessionId = verifyUserAccessToken(header.slice('Bearer '.length), secret).sessionId;
    } catch {
      return true;
    }

    if (await isSessionRevoked(sessionId)) {
      throw new UnauthorizedException('Session revoked');
    }
    return true;
  }
}
