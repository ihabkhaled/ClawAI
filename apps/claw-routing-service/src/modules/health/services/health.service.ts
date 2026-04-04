import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { RedisService } from "../../../infrastructure/redis/redis.service";
import { HealthCheckStatus, ServiceStatus } from "../../../common/enums";
import { HealthStatus } from "../types/health.types";

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<HealthStatus> {
    const [dbOk, redisOk] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const allUp = dbOk && redisOk;
    const allDown = !dbOk && !redisOk;

    let status: HealthCheckStatus;
    if (allUp) {
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
      },
    };
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
      return pong === "PONG";
    } catch {
      return false;
    }
  }
}
