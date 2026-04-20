import { CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_SCOPES_METADATA_KEY } from '../decorators/require-scopes.decorator';
import type { DeviceScope } from '../enums/device-scope.enum';
import type { AgentRequest } from '../types/auth.types';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<DeviceScope[] | undefined>(
      REQUIRE_SCOPES_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (required === undefined || required.length === 0) return true;
    const request = context.switchToHttp().getRequest<AgentRequest>();
    // Legacy sessionKey path has no device context; scopes are not enforceable there.
    // The Sunset header forces the cutover at Phase B GA; until then pass through.
    if (request.deviceContext === undefined) return true;
    const scopes = request.deviceContext.scopes;
    const missing = required.filter((scope) => !scopes.includes(scope));
    if (missing.length > 0) {
      throw new ForbiddenException({
        code: 'scope_denied',
        messageKey: 'agent.scope.denied',
        details: { missing },
      });
    }
    return true;
  }
}
