import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { HealthCheckStatus, ServiceStatus } from '../../../common/enums';
import { type HealthStatus } from '../types/health.types';

@Injectable()
export class HealthService {
  constructor(private readonly redis: RedisService) {}

  async check(): Promise<HealthStatus> {
    const redisOk = await this.checkRedis();

    return {
      status: redisOk ? HealthCheckStatus.OK : HealthCheckStatus.DEGRADED,
      timestamp: new Date().toISOString(),
      services: {
        redis: redisOk ? ServiceStatus.UP : ServiceStatus.DOWN,
      },
    };
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const pong = await this.redis.getClient().ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }
}
