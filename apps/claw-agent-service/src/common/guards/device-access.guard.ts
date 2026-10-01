import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DeviceTokenClass } from '@claw/shared-types';
import { RevocationCacheService } from '../../modules/agent/services/revocation-cache.service';
import { TokenService } from '../../modules/agent/services/token.service';
import { DeviceRepository } from '../../modules/agent/repositories/device.repository';
import { MOBILE_ROUTE_METADATA_KEY } from '../decorators/mobile-route.decorator';
import { REQUIRE_SCOPES_METADATA_KEY } from '../decorators/require-scopes.decorator';
import { DeviceStatus } from '../enums/device-status.enum';
import { isMobileScope, parseDeviceTokenClass, parseScopesCsv } from '../utilities/device.utility';
import type { AgentRequest, AgentScope, DeviceContext } from '../types/auth.types';

@Injectable()
export class DeviceAccessGuard implements CanActivate {
  private readonly logger = new Logger(DeviceAccessGuard.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly deviceRepo: DeviceRepository,
    private readonly revocationCache: RevocationCacheService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AgentRequest>();
    const authHeader = request.headers['authorization'] as string | undefined;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing access token');
    }
    const token = authHeader.slice(7);
    const claims = this.tokenService.verifyAccess(token);
    if (claims === null) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    if (await this.revocationCache.isJtiRevoked(claims.jti)) {
      throw new UnauthorizedException('Token revoked');
    }
    if (await this.revocationCache.isDeviceRevoked(claims.deviceId)) {
      throw new UnauthorizedException('Device revoked');
    }
    const device = await this.deviceRepo.findById(claims.deviceId);
    if (device?.status !== DeviceStatus.ACTIVE) {
      throw new UnauthorizedException('Device not active');
    }
    // The row is the authority on the class; the token has to agree with it.
    const deviceClass = parseDeviceTokenClass(device.tokenClass);
    if (deviceClass === null || deviceClass !== claims.tokenClass) {
      throw new UnauthorizedException('Device credential class mismatch');
    }
    const scopes = this.resolveScopes(context, deviceClass, claims.scopes, device.scopesCsv);
    const ctx: DeviceContext = {
      deviceId: claims.deviceId,
      userId: claims.sub,
      scopes,
      jti: claims.jti,
      orgId: device.orgId,
      tokenClass: deviceClass,
    };
    request.deviceContext = ctx;
    return true;
  }

  /**
   * F097 allow-list. A mobile token reaches a route only when the route says
   * `@MobileRoute()` AND names the scopes it needs; a desktop token never
   * reaches a `@MobileRoute()` route. Both refusals are 403, and neither
   * reveals whether the route exists for the other class.
   */
  private resolveScopes(
    context: ExecutionContext,
    deviceClass: DeviceTokenClass,
    claimedScopes: string[],
    storedScopesCsv: string,
  ): AgentScope[] {
    const mobileRoute =
      this.reflector.getAllAndOverride<boolean | undefined>(MOBILE_ROUTE_METADATA_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true;
    const mobileToken = deviceClass === DeviceTokenClass.MOBILE;
    if (mobileToken !== mobileRoute) {
      this.logger.warn(
        `Refused ${deviceClass} credential on a ${mobileRoute ? 'mobile' : 'non-mobile'} route`,
      );
      throw new ForbiddenException({
        code: 'token_class_denied',
        messageKey: 'agent.token_class.denied',
      });
    }
    if (!mobileToken) return claimedScopes as AgentScope[];
    const declared = this.reflector.getAllAndOverride<AgentScope[] | undefined>(
      REQUIRE_SCOPES_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    // A mobile route that forgot to name its scope is closed, not open.
    if (declared === undefined || declared.length === 0) {
      throw new ForbiddenException({
        code: 'token_class_denied',
        messageKey: 'agent.token_class.denied',
      });
    }
    // Token, live device row and the fixed mobile list must ALL grant it, so
    // narrowing the row takes effect at once and nothing can widen past the list.
    const stored = new Set<string>(parseScopesCsv(storedScopesCsv));
    return claimedScopes.filter(
      (scope): scope is AgentScope => isMobileScope(scope) && stored.has(scope),
    );
  }
}
