import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors/business.exception';
import { DeviceStatus } from '../../../common/enums/device-status.enum';
import { DeviceCodeError } from '../../../common/enums/device-code-error.enum';
import { DeviceCodeStatus } from '../../../common/enums/device-code-status.enum';
import {
  DEVICE_CODE_BYTES,
  DEVICE_CODE_MAX_OFFENCES,
  DEVICE_CODE_SLOW_DOWN_PENALTY_SECONDS,
} from '../../../common/constants/auth.constants';
import { generateRandomBase64Url } from '../../../common/utilities/token.utility';
import { generateUserCode } from '../../../common/utilities/user-code.utility';
import { DeviceCodeRequestRepository } from '../repositories/device-code-request.repository';
import { DeviceRepository } from '../repositories/device.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { TokenService } from './token.service';
import type { DeviceScope } from '../../../common/enums/device-scope.enum';
import type { DeviceCodeCreateDto } from '../dto/device-code-create.dto';
import type {
  DeviceCodeCreateResult,
  DeviceCodeTokenResult,
  IssuedTokenPair,
  PairApproveResult,
} from '../types/agent.types';

@Injectable()
export class DeviceCodeService {
  private readonly logger = new Logger(DeviceCodeService.name);

  constructor(
    private readonly repo: DeviceCodeRequestRepository,
    private readonly deviceRepo: DeviceRepository,
    private readonly refreshRepo: RefreshTokenRepository,
    private readonly tokenService: TokenService,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  async create(dto: DeviceCodeCreateDto): Promise<DeviceCodeCreateResult> {
    const config = AppConfig.get();
    const deviceCode = generateRandomBase64Url(DEVICE_CODE_BYTES);
    const userCode = await this.pickUniqueUserCode();
    const expiresAt = new Date(Date.now() + config.AGENT_DEVICE_CODE_TTL_SECONDS * 1_000);
    await this.repo.create({
      deviceCodeHash: this.hashCode(deviceCode),
      userCode,
      deviceHint: dto.deviceHint,
      expiresAt,
      status: DeviceCodeStatus.PENDING,
    });
    const verificationUri = `${config.NEXT_PUBLIC_APP_URL}/agent/pair`;
    return {
      deviceCode,
      userCode,
      verificationUri,
      verificationUriComplete: `${verificationUri}?code=${userCode}`,
      expiresIn: config.AGENT_DEVICE_CODE_TTL_SECONDS,
      intervalSeconds: 5,
    };
  }

  private async pickUniqueUserCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateUserCode();
      const existing = await this.repo.findByUserCode(candidate);
      if (existing === null) return candidate;
    }
    throw new BusinessException(
      'agent.device_code.collision',
      'internal_error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  async exchange(deviceCode: string, ip: string | null): Promise<DeviceCodeTokenResult> {
    const request = await this.repo.findByHash(this.hashCode(deviceCode));
    const terminal = this.terminalState(request);
    if (terminal !== null) return terminal;
    if (request === null) {
      return { success: false, code: DeviceCodeError.EXPIRED_TOKEN };
    }
    if (request.status !== DeviceCodeStatus.APPROVED) {
      return this.pendingOrSlowDown(request);
    }
    if (request.approvedDeviceId === null || request.approvedByUserId === null) {
      return { success: false, code: DeviceCodeError.AUTHORIZATION_PENDING };
    }
    const tokens = await this.issueTokensForApproval(
      request.id,
      request.approvedByUserId,
      request.approvedDeviceId,
      (request.approvedScopesCsv ?? '').split(',').filter((s) => s.length > 0) as DeviceScope[],
      ip,
    );
    return { success: true, tokens };
  }

  private terminalState(
    request: Awaited<ReturnType<DeviceCodeRequestRepository['findByHash']>>,
  ): DeviceCodeTokenResult | null {
    if (request === null) return { success: false, code: DeviceCodeError.EXPIRED_TOKEN };
    if (request.expiresAt.getTime() <= Date.now()) {
      return { success: false, code: DeviceCodeError.EXPIRED_TOKEN };
    }
    if (request.status === DeviceCodeStatus.DENIED) {
      return { success: false, code: DeviceCodeError.ACCESS_DENIED };
    }
    if (request.status === DeviceCodeStatus.CONSUMED) {
      return { success: false, code: DeviceCodeError.EXPIRED_TOKEN };
    }
    return null;
  }

  private async pendingOrSlowDown(
    request: NonNullable<Awaited<ReturnType<DeviceCodeRequestRepository['findByHash']>>>,
  ): Promise<DeviceCodeTokenResult> {
    if (request.slowDownUntil !== null && request.slowDownUntil.getTime() > Date.now()) {
      await this.bumpOffence(request.id, request.offenceCount + 1);
      return { success: false, code: DeviceCodeError.SLOW_DOWN };
    }
    return { success: false, code: DeviceCodeError.AUTHORIZATION_PENDING };
  }

  private async bumpOffence(id: string, newCount: number): Promise<void> {
    if (newCount >= DEVICE_CODE_MAX_OFFENCES) {
      await this.repo.deny(id, 'system:abuse');
      return;
    }
    const slowUntil = new Date(Date.now() + DEVICE_CODE_SLOW_DOWN_PENALTY_SECONDS * 1_000);
    await this.repo.incrementOffence(id, slowUntil);
  }

  async approve(
    userId: string,
    userCode: string,
    scopes: DeviceScope[],
    deviceName: string | undefined,
  ): Promise<PairApproveResult> {
    const request = await this.loadPendingOrThrow(userCode);
    const hint = request.deviceHint as {
      name?: string;
      hostname: string;
      os: string;
      platform: string;
      agentVersion: string;
    };
    const device = await this.deviceRepo.create({
      userId,
      name: deviceName ?? hint.name ?? hint.hostname,
      hostname: hint.hostname,
      os: hint.os,
      platform: hint.platform,
      agentVersion: hint.agentVersion,
      scopesCsv: scopes.join(','),
      status: DeviceStatus.ACTIVE,
      lastSeenAt: new Date(),
    });
    const updated = await this.repo.approve(request.id, userId, device.id, scopes.join(','));
    if (updated === null) {
      throw new BusinessException(
        'agent.device_code.already_consumed',
        'device_code_already_consumed',
        HttpStatus.CONFLICT,
      );
    }
    void this.publish(EventPattern.AGENT_DEVICE_PAIRED, {
      deviceId: device.id,
      userId,
      scopes,
      hostname: hint.hostname,
      os: hint.os,
      platform: hint.platform,
      agentVersion: hint.agentVersion,
    });
    this.logger.log(`Device paired via device-code: ${device.id}`);
    return { deviceId: device.id };
  }

  private async loadPendingOrThrow(userCode: string): Promise<{ id: string; deviceHint: unknown }> {
    const request = await this.repo.findByUserCode(userCode);
    if (request === null) {
      throw new BusinessException(
        'agent.device_code.not_found',
        'device_code_not_found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (request.expiresAt.getTime() <= Date.now()) {
      throw new BusinessException(
        'agent.device_code.expired',
        'device_code_expired',
        HttpStatus.GONE,
      );
    }
    if (request.status !== DeviceCodeStatus.PENDING) {
      throw new BusinessException(
        'agent.device_code.already_consumed',
        'device_code_already_consumed',
        HttpStatus.CONFLICT,
      );
    }
    return { id: request.id, deviceHint: request.deviceHint };
  }

  async deny(userId: string, userCode: string): Promise<void> {
    const request = await this.repo.findByUserCode(userCode);
    if (request === null) {
      throw new BusinessException(
        'agent.device_code.not_found',
        'device_code_not_found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (request.status !== DeviceCodeStatus.PENDING) return;
    await this.repo.deny(request.id, userId);
  }

  private async issueTokensForApproval(
    requestId: string,
    userId: string,
    deviceId: string,
    scopes: DeviceScope[],
    ip: string | null,
  ): Promise<IssuedTokenPair> {
    const { pair, refreshHash, refreshJti } = this.tokenService.issuePair(
      userId,
      deviceId,
      scopes,
      null,
    );
    const expiresAt = new Date(
      Date.now() + AppConfig.get().AGENT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1_000,
    );
    await this.refreshRepo.create({
      device: { connect: { id: deviceId } },
      tokenHash: refreshHash,
      jti: refreshJti,
      expiresAt,
      lastUsedIp: ip,
    });
    await this.repo.markConsumed(requestId);
    return pair;
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
