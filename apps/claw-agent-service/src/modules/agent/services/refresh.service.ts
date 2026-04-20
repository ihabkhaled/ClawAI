import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors/business.exception';
import { DeviceStatus } from '../../../common/enums/device-status.enum';
import { RefreshTokenStatus } from '../../../common/enums/refresh-token-status.enum';
import { DeviceRepository } from '../repositories/device.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { RevocationCacheService } from './revocation-cache.service';
import { TokenService } from './token.service';
import type { DeviceScope } from '../../../common/enums/device-scope.enum';
import type { Device, RefreshToken } from '../../../generated/prisma';
import type { IssuedTokenPair } from '../types/agent.types';

@Injectable()
export class RefreshService {
  private readonly logger = new Logger(RefreshService.name);

  constructor(
    private readonly refreshRepo: RefreshTokenRepository,
    private readonly deviceRepo: DeviceRepository,
    private readonly tokenService: TokenService,
    private readonly revocationCache: RevocationCacheService,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async refresh(presentedToken: string, ip: string | null): Promise<IssuedTokenPair> {
    const stored = await this.findStoredOrThrow(presentedToken);
    const device = await this.loadActiveDeviceOrThrow(stored.deviceId);
    if (stored.status === RefreshTokenStatus.REVOKED) {
      throw this.unauthorized('agent.device.revoked', 'device_revoked');
    }
    if (stored.status === RefreshTokenStatus.USED) {
      return this.handleReuse(stored.id, stored.deviceId, device.userId, stored.jti, ip);
    }
    return this.rotate(stored, device, ip);
  }

  private async findStoredOrThrow(presentedToken: string): Promise<RefreshToken> {
    const hash = this.tokenService.hashRefresh(presentedToken);
    const stored = await this.refreshRepo.findByHash(hash);
    if (stored === null) throw this.unauthorized('agent.refresh.invalid', 'refresh_invalid');
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw this.unauthorized('agent.refresh.expired', 'refresh_expired');
    }
    return stored;
  }

  private async loadActiveDeviceOrThrow(deviceId: string): Promise<Device> {
    const device = await this.deviceRepo.findById(deviceId);
    if (device === null || device.status === DeviceStatus.REVOKED) {
      throw this.unauthorized('agent.device.revoked', 'device_revoked');
    }
    return device;
  }

  private async rotate(
    stored: RefreshToken,
    device: Device,
    ip: string | null,
  ): Promise<IssuedTokenPair> {
    const scopes = device.scopesCsv.split(',').filter((s) => s.length > 0) as DeviceScope[];
    const issued = this.tokenService.issuePair(device.userId, device.id, scopes, device.orgId);
    const expiresAt = new Date(
      Date.now() + AppConfig.get().AGENT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1_000,
    );
    const newRow = await this.refreshRepo.create({
      device: { connect: { id: device.id } },
      tokenHash: issued.refreshHash,
      jti: issued.refreshJti,
      expiresAt,
      lastUsedIp: ip,
    });
    await this.refreshRepo.markUsed(stored.id, newRow.id, ip);
    await this.deviceRepo.updateLastSeen(device.id, ip);
    void this.publish(EventPattern.AGENT_TOKEN_ROTATED, {
      deviceId: device.id,
      userId: device.userId,
      oldJti: stored.jti,
      newJti: issued.refreshJti,
      ipAddress: ip ?? undefined,
    });
    return issued.pair;
  }

  private async handleReuse(
    usedId: string,
    deviceId: string,
    userId: string,
    presentedJti: string,
    ip: string | null,
  ): Promise<never> {
    this.logger.warn(
      `Refresh reuse detected for device ${deviceId} (token ${usedId}); revoking device`,
    );
    await this.refreshRepo.revokeAllForDevice(deviceId);
    await this.deviceRepo.markRevoked(deviceId, 'refresh_reuse_detected');
    await this.revocationCache.revokeDevice(deviceId, 'refresh_reuse_detected');
    void this.publish(EventPattern.AGENT_TOKEN_REUSE_DETECTED, {
      deviceId,
      userId,
      presentedJti,
      ipAddress: ip ?? undefined,
    });
    void this.publish(EventPattern.AGENT_DEVICE_REVOKED, {
      deviceId,
      userId,
      reason: 'refresh_reuse_detected',
    });
    throw this.unauthorized('agent.refresh.reuse_detected', 'refresh_reuse_detected');
  }

  async revokeDevice(userId: string, deviceId: string, reason: string | null): Promise<void> {
    const device = await this.deviceRepo.findByIdForUser(deviceId, userId);
    if (device === null) {
      throw new BusinessException(
        'agent.device.not_found',
        'device_not_found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (device.status === DeviceStatus.REVOKED) return;
    await this.refreshRepo.revokeAllForDevice(deviceId);
    await this.deviceRepo.markRevoked(deviceId, reason);
    await this.revocationCache.revokeDevice(deviceId, reason ?? 'user_revoked');
    void this.publish(EventPattern.AGENT_DEVICE_REVOKED, {
      deviceId,
      userId: device.userId,
      reason: reason ?? 'user_revoked',
      revokedByUserId: userId,
    });
    this.logger.log(`Device revoked: ${deviceId} by user ${userId}`);
  }

  private unauthorized(messageKey: string, code: string): BusinessException {
    return new BusinessException(messageKey, code, HttpStatus.UNAUTHORIZED);
  }

  private async publish(pattern: EventPattern, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.rabbitMQ.publish(pattern, { ...payload, timestamp: new Date().toISOString() });
    } catch (error) {
      this.logger.error(
        `Failed to publish ${pattern}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
