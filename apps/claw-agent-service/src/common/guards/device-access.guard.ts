import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RevocationCacheService } from '../../modules/agent/services/revocation-cache.service';
import { TokenService } from '../../modules/agent/services/token.service';
import { DeviceRepository } from '../../modules/agent/repositories/device.repository';
import { DeviceStatus } from '../enums/device-status.enum';
import type { DeviceScope } from '../enums/device-scope.enum';
import type { AgentRequest, DeviceContext } from '../types/auth.types';

@Injectable()
export class DeviceAccessGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly deviceRepo: DeviceRepository,
    private readonly revocationCache: RevocationCacheService,
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
    const ctx: DeviceContext = {
      deviceId: claims.deviceId,
      userId: claims.sub,
      scopes: claims.scopes as DeviceScope[],
      jti: claims.jti,
      orgId: device.orgId,
    };
    request.deviceContext = ctx;
    return true;
  }
}
