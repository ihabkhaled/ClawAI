import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyAccessToken } from '@claw/shared-utilities';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_SERVICE_TOKEN_KEY } from '../decorators/allow-service-token.decorator';
import { AppConfig } from '../config/app.config';
import { type AuthenticatedRequest, type JwtPayload } from '../../common/types';
import { SERVICE_TOKEN_SCHEME_PREFIX } from '../../common/constants/service-token.constants';
import { constantTimeEqual } from '../../common/utilities/constant-time-equal.utility';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    if (authHeader.startsWith(SERVICE_TOKEN_SCHEME_PREFIX)) {
      return this.verifyServiceToken(context, authHeader);
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const token = parts[1];
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    const config = AppConfig.get();

    try {
      const payload = verifyAccessToken<JwtPayload>(token, config.JWT_SECRET);
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  // ADR-144: inference and pull-progress accept a user JWT OR the
  // inter-service token. The token is honoured only where the route opts in
  // with @AllowServiceToken(), so it never unlocks an admin or lifecycle route.
  private verifyServiceToken(context: ExecutionContext, authHeader: string): boolean {
    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_SERVICE_TOKEN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed) {
      throw new UnauthorizedException('Service token not accepted on this route');
    }
    const provided = authHeader.slice(SERVICE_TOKEN_SCHEME_PREFIX.length);
    if (!constantTimeEqual(provided, AppConfig.get().INTER_SERVICE_AUTH_TOKEN)) {
      throw new UnauthorizedException('Invalid service token');
    }
    return true;
  }
}
