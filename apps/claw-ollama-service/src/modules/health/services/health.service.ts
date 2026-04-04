import { Injectable } from "@nestjs/common";
import axios from "axios";
import { RedisService } from "../../../infrastructure/redis/redis.service";
import { AppConfig } from "../../../app/config/app.config";
import { HealthCheckStatus, ServiceStatus } from "../../../common/enums";
import { HealthStatus } from "../types/health.types";

@Injectable()
export class HealthService {
  constructor(private readonly redis: RedisService) {}

  async check(): Promise<HealthStatus> {
    const [ollamaOk, redisOk] = await Promise.all([
      this.checkOllama(),
      this.checkRedis(),
    ]);

    const allUp = ollamaOk && redisOk;
    const allDown = !ollamaOk && !redisOk;

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
        ollama: ollamaOk ? ServiceStatus.UP : ServiceStatus.DOWN,
        redis: redisOk ? ServiceStatus.UP : ServiceStatus.DOWN,
      },
    };
  }

  private async checkOllama(): Promise<boolean> {
    try {
      const config = AppConfig.get();
      const response = await axios.get(`${config.OLLAMA_BASE_URL}/api/tags`, {
        timeout: 3000,
      });
      return response.status === 200;
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
