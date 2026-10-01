import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { MOBILE_MAX_ACTIVE_DEVICES_PER_USER } from '@claw/shared-constants';
import { DeviceTokenClass, EventPattern } from '@claw/shared-types';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors/business.exception';
import { DeviceStatus } from '../../../common/enums/device-status.enum';
import { PairingStatus } from '../../../common/enums/pairing-status.enum';
import { PAIRING_CODE_BYTES, STATE_NONCE_BYTES } from '../../../common/constants/auth.constants';
import { generateRandomBase64Url } from '../../../common/utilities/token.utility';
import {
  parseDeviceTokenClass,
  parseScopesCsv,
  scopesFitTokenClass,
} from '../../../common/utilities/device.utility';
import { DeviceRepository } from '../repositories/device.repository';
import { PairingRequestRepository } from '../repositories/pairing-request.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { TokenService } from './token.service';
import type { AgentScope } from '../../../common/types/auth.types';
import type { PairInitDto } from '../dto/pair-init.dto';
import type {
  IssuedTokenPair,
  PairApproveResult,
  PairInitResult,
  PairPollResult,
} from '../types/agent.types';

@Injectable()
export class PairingService {
  private readonly logger = new Logger(PairingService.name);

  constructor(
    private readonly pairingRepo: PairingRequestRepository,
    private readonly deviceRepo: DeviceRepository,
    private readonly refreshRepo: RefreshTokenRepository,
    private readonly tokenService: TokenService,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  async initiate(dto: PairInitDto): Promise<PairInitResult> {
    const config = AppConfig.get();
    const pairingCode = generateRandomBase64Url(PAIRING_CODE_BYTES);
    const stateNonce = generateRandomBase64Url(STATE_NONCE_BYTES);
    const expiresAt = new Date(Date.now() + config.AGENT_PAIRING_TTL_SECONDS * 1_000);
    await this.pairingRepo.create({
      codeHash: this.hashCode(pairingCode),
      stateNonce,
      deviceHint: dto.deviceHint,
      loopbackPort: dto.loopbackPort ?? null,
      expiresAt,
      status: PairingStatus.PENDING,
    });
    const verificationUrl = `${config.NEXT_PUBLIC_APP_URL}/agent/connect?pairingCode=${pairingCode}&state=${stateNonce}`;
    return {
      pairingCode,
      verificationUrl,
      expiresAt,
      intervalSeconds: 2,
    };
  }

  async approve(
    userId: string,
    pairingCode: string,
    scopes: AgentScope[],
    deviceName: string | undefined,
    tokenClass: DeviceTokenClass = DeviceTokenClass.DEVICE,
  ): Promise<PairApproveResult> {
    const request = await this.loadPendingPairingOrThrow(pairingCode);
    await this.assertMayIssue(userId, scopes, tokenClass);
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
      tokenClass,
      status: DeviceStatus.ACTIVE,
      lastSeenAt: new Date(),
    });
    const updated = await this.pairingRepo.approve(request.id, userId, device.id, scopes.join(','));
    if (updated === null) {
      throw new BusinessException(
        'agent.pairing.already_consumed',
        'pairing_already_consumed',
        HttpStatus.CONFLICT,
      );
    }
    void this.publish(EventPattern.AGENT_DEVICE_PAIRED, {
      deviceId: device.id,
      userId,
      scopes,
      tokenClass,
      hostname: hint.hostname,
      os: hint.os,
      platform: hint.platform,
      agentVersion: hint.agentVersion,
    });
    this.logger.log(`Device paired: ${device.id} for user ${userId}`);
    return { deviceId: device.id };
  }

  /**
   * F097. The scope list has to be legal for the class (a mobile token carries
   * the three run scopes and nothing else, a desktop token none of them), and a
   * user holds a bounded number of live mobile devices.
   */
  private async assertMayIssue(
    userId: string,
    scopes: AgentScope[],
    tokenClass: DeviceTokenClass,
  ): Promise<void> {
    if (!scopesFitTokenClass(scopes, tokenClass)) {
      throw new BusinessException(
        'agent.pairing.scope_class_mismatch',
        'pairing_scope_class_mismatch',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (tokenClass !== DeviceTokenClass.MOBILE) return;
    const active = await this.deviceRepo.countActiveByClass(userId, tokenClass);
    if (active >= MOBILE_MAX_ACTIVE_DEVICES_PER_USER) {
      throw new BusinessException(
        'agent.mobile.device_limit',
        'mobile_device_limit',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async loadPendingPairingOrThrow(pairingCode: string): Promise<{
    id: string;
    deviceHint: unknown;
  }> {
    const request = await this.pairingRepo.findByCodeHash(this.hashCode(pairingCode));
    if (request === null) {
      throw new BusinessException(
        'agent.pairing.not_found',
        'pairing_not_found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (request.expiresAt.getTime() <= Date.now()) {
      throw new BusinessException('agent.pairing.expired', 'pairing_expired', HttpStatus.GONE);
    }
    if (request.status !== PairingStatus.PENDING) {
      throw new BusinessException(
        'agent.pairing.already_consumed',
        'pairing_already_consumed',
        HttpStatus.CONFLICT,
      );
    }
    return { id: request.id, deviceHint: request.deviceHint };
  }

  async deny(userId: string, pairingCode: string): Promise<void> {
    const request = await this.pairingRepo.findByCodeHash(this.hashCode(pairingCode));
    if (request === null) {
      throw new BusinessException(
        'agent.pairing.not_found',
        'pairing_not_found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (request.status !== PairingStatus.PENDING) return;
    await this.pairingRepo.deny(request.id, userId);
  }

  async poll(pairingCode: string, ip: string | null): Promise<PairPollResult> {
    const request = await this.pairingRepo.findByCodeHash(this.hashCode(pairingCode));
    if (request === null) {
      throw new BusinessException(
        'agent.pairing.not_found',
        'pairing_not_found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (request.status === PairingStatus.EXPIRED || request.expiresAt.getTime() <= Date.now()) {
      return { status: 'expired' };
    }
    if (request.status === PairingStatus.DENIED) return { status: 'denied' };
    if (request.status === PairingStatus.CONSUMED) return { status: 'expired' };
    if (request.status !== PairingStatus.APPROVED) return { status: 'pending' };
    return request.approvedDeviceId === null || request.approvedByUserId === null
      ? { status: 'pending' }
      : this.pollApproved(
          { id: request.id, scopesCsv: request.approvedScopesCsv ?? '' },
          request.approvedByUserId,
          request.approvedDeviceId,
          ip,
        );
  }

  private async pollApproved(
    request: { id: string; scopesCsv: string },
    userId: string,
    deviceId: string,
    ip: string | null,
  ): Promise<PairPollResult> {
    const device = await this.deviceRepo.findById(deviceId);
    const tokenClass = device === null ? null : parseDeviceTokenClass(device.tokenClass);
    // A row of a class we do not know is never handed a token.
    if (tokenClass === null) return { status: 'expired' };
    const tokens = await this.issueTokensForApproval(
      request.id,
      userId,
      deviceId,
      parseScopesCsv(request.scopesCsv),
      tokenClass,
      ip,
    );
    return { status: 'approved', tokens };
  }

  private async issueTokensForApproval(
    requestId: string,
    userId: string,
    deviceId: string,
    scopes: AgentScope[],
    tokenClass: DeviceTokenClass,
    ip: string | null,
  ): Promise<IssuedTokenPair> {
    const { pair, refreshHash, refreshJti } = this.tokenService.issuePair(
      userId,
      deviceId,
      scopes,
      null,
      tokenClass,
    );
    const expiresAt = this.tokenService.refreshExpiry(tokenClass);
    await this.refreshRepo.create({
      device: { connect: { id: deviceId } },
      tokenHash: refreshHash,
      jti: refreshJti,
      expiresAt,
      lastUsedIp: ip,
    });
    await this.pairingRepo.markConsumed(requestId);
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
