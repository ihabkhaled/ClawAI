import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { AppConfig } from '../../../app/config/app.config';

@Injectable()
export class RevocationCacheService {
  constructor(private readonly redis: RedisService) {}

  private deviceKey(deviceId: string): string {
    return `agent:revocation:device:${deviceId}`;
  }

  private jtiKey(jti: string): string {
    return `agent:revocation:jti:${jti}`;
  }

  async revokeDevice(deviceId: string, reason: string): Promise<void> {
    const ttlSeconds = AppConfig.get().AGENT_ACCESS_TTL_SECONDS;
    await this.redis.set(this.deviceKey(deviceId), reason, ttlSeconds);
  }

  async revokeJti(jti: string): Promise<void> {
    const ttlSeconds = AppConfig.get().AGENT_ACCESS_TTL_SECONDS;
    await this.redis.set(this.jtiKey(jti), '1', ttlSeconds);
  }

  async isDeviceRevoked(deviceId: string): Promise<boolean> {
    return this.redis.exists(this.deviceKey(deviceId));
  }

  async isJtiRevoked(jti: string): Promise<boolean> {
    return this.redis.exists(this.jtiKey(jti));
  }
}
