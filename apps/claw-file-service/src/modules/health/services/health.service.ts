import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { ClamavClient } from '../../../infrastructure/clamav/clamav.client';
import { HealthCheckStatus, ServiceStatus } from '../../../common/enums';
import { HealthStatus } from '../types/health.types';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly clamav: ClamavClient,
  ) {}

  async check(): Promise<HealthStatus> {
    const [dbOk, redisOk, clamavOk] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.clamav.ping(),
    ]);

    const allUp = dbOk && redisOk;
    const allDown = !dbOk && !redisOk;
    // clamd down refuses uploads but nothing else: DEGRADED, never DOWN, and
    // the HTTP answer stays 200 so the container healthcheck does not restart
    // file-service over a dependency a restart cannot fix.
    const clamavDown = clamavOk === false;

    let status: HealthCheckStatus;
    if (allUp && !clamavDown) {
      status = HealthCheckStatus.OK;
    } else if (allDown) {
      status = HealthCheckStatus.DOWN;
    } else {
      status = HealthCheckStatus.DEGRADED;
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbOk ? ServiceStatus.UP : ServiceStatus.DOWN,
        redis: redisOk ? ServiceStatus.UP : ServiceStatus.DOWN,
        clamav: this.clamavStatus(clamavOk),
      },
    };
  }

  private clamavStatus(ok: boolean | null): ServiceStatus {
    if (ok === null) {
      return ServiceStatus.DISABLED;
    }
    return ok ? ServiceStatus.UP : ServiceStatus.DOWN;
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
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
