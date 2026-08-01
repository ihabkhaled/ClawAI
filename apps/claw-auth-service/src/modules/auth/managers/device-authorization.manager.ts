import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { hashBearerToken } from '@claw/shared-utilities';
import { AppConfig } from '../../../app/config/app.config';
import { UserStatus } from '../../../common/enums';
import { InvalidCredentialsException } from '../../../common/errors';
import { signRefreshToken } from '../../../common/utilities';
import {
  DEVICE_CODE_TTL_SECONDS,
  DEVICE_POLL_INTERVAL_SECONDS,
  DEVICE_SLOW_DOWN_SECONDS,
  MILLISECONDS_PER_SECOND,
} from '../constants/device-authorization.constants';
import { DeviceAuthorizationStatus } from '../enums/device-authorization-status.enum';
import { AuthRepository } from '../repositories/auth.repository';
import { DeviceAuthorizationRepository } from '../repositories/device-authorization.repository';
import type {
  DeviceAuthorizationCreated,
  DeviceAuthorizationExchange,
  DeviceClient,
} from '../types/device-authorization.types';
import { SessionClientKind } from '../enums/session-client-kind.enum';
import { TokenSessionManager } from './token-session.manager';

@Injectable()
export class DeviceAuthorizationManager {
  constructor(
    private readonly deviceRepository: DeviceAuthorizationRepository,
    private readonly authRepository: AuthRepository,
    private readonly tokenSessionManager: TokenSessionManager,
  ) {}

  async create(client: DeviceClient): Promise<DeviceAuthorizationCreated> {
    const deviceCode = signRefreshToken();
    const userCode = this.createUserCode();
    const config = AppConfig.get();
    await this.deviceRepository.create({
      deviceCodeHash: hashBearerToken(deviceCode, `device-code:${config.JWT_SECRET}`),
      userCode,
      clientName: client.name,
      clientVersion: client.version,
      intervalSeconds: DEVICE_POLL_INTERVAL_SECONDS,
      expiresAt: new Date(Date.now() + DEVICE_CODE_TTL_SECONDS * MILLISECONDS_PER_SECOND),
    });
    return {
      deviceCode,
      userCode,
      expiresIn: DEVICE_CODE_TTL_SECONDS,
      interval: DEVICE_POLL_INTERVAL_SECONDS,
    };
  }

  async approve(userId: string, userCode: string): Promise<void> {
    const user = await this.authRepository.findUserById(userId);
    if (user?.status !== UserStatus.ACTIVE) {
      throw new InvalidCredentialsException();
    }
    const approved = await this.deviceRepository.approve(
      userCode.toUpperCase(),
      userId,
      new Date(),
    );
    if (!approved) {
      throw new InvalidCredentialsException();
    }
  }

  async deny(_userId: string, userCode: string): Promise<void> {
    const denied = await this.deviceRepository.deny(userCode.toUpperCase(), new Date());
    if (!denied) {
      throw new InvalidCredentialsException();
    }
  }

  async exchange(deviceCode: string): Promise<DeviceAuthorizationExchange> {
    const config = AppConfig.get();
    const grant = await this.deviceRepository.findByDeviceCodeHash(
      hashBearerToken(deviceCode, `device-code:${config.JWT_SECRET}`),
    );
    const now = new Date();
    if (!grant || grant.expiresAt <= now) {
      return { error: 'expired_token' };
    }
    if (grant.status === DeviceAuthorizationStatus.DENIED) {
      return { error: 'access_denied' };
    }
    if (this.isEarlyPoll(grant.lastPolledAt, grant.intervalSeconds, now)) {
      const interval = await this.deviceRepository.slowDown(
        grant.id,
        now,
        DEVICE_SLOW_DOWN_SECONDS,
      );
      return { error: 'slow_down', interval };
    }
    await this.deviceRepository.recordPoll(grant.id, now);
    if (grant.status === DeviceAuthorizationStatus.PENDING) {
      return { error: 'authorization_pending' };
    }
    if (grant.status !== DeviceAuthorizationStatus.APPROVED || !grant.approvedByUserId) {
      return { error: 'access_denied' };
    }
    const consumed = await this.deviceRepository.consume(grant.id, now);
    if (!consumed) {
      return { error: 'access_denied' };
    }
    const user = await this.authRepository.findUserById(grant.approvedByUserId);
    if (user?.status !== UserStatus.ACTIVE) {
      return { error: 'access_denied' };
    }
    return this.tokenSessionManager.issue(user, {
      kind: SessionClientKind.VSCODE,
      name: grant.clientName,
    });
  }

  private createUserCode(): string {
    const value = randomBytes(4).toString('hex').toUpperCase();
    return `${value.slice(0, 4)}-${value.slice(4)}`;
  }

  private isEarlyPoll(lastPolledAt: Date | null, interval: number, now: Date): boolean {
    return Boolean(
      lastPolledAt && lastPolledAt.getTime() + interval * MILLISECONDS_PER_SECOND > now.getTime(),
    );
  }
}
