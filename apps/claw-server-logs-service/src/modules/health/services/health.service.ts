import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { RedisService } from "../../../infrastructure/redis/redis.service";
import { HealthCheckStatus, ServiceStatus } from "../../../common/enums";
import { HealthStatus } from "../types/health.types";

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<HealthStatus> {
    const [mongoOk, redisOk] = await Promise.all([
      this.checkMongoDB(),
      this.checkRedis(),
    ]);

    const allUp = mongoOk && redisOk;
    const allDown = !mongoOk && !redisOk;

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
        mongodb: mongoOk ? ServiceStatus.UP : ServiceStatus.DOWN,
        redis: redisOk ? ServiceStatus.UP : ServiceStatus.DOWN,
      },
    };
  }

  private async checkMongoDB(): Promise<boolean> {
    try {
      const readyState = this.mongoConnection.readyState;
      return readyState === 1;
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
