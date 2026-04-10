import { Injectable, Logger } from "@nestjs/common";
import { httpGet } from "@common/utilities";
import { HEALTH_CHECK_TIMEOUT_MS, SERVICE_URLS } from "../constants/health.constants";
import { AggregatedHealth, ServiceHealthResult } from "../types/health.types";

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  async checkAll(): Promise<AggregatedHealth> {
    this.logger.log(`checkAll: checking health of ${String(Object.keys(SERVICE_URLS).length)} services`);
    const entries = Object.entries(SERVICE_URLS);
    const results = await Promise.all(
      entries.map(([name, url]) => this.checkService(name, url)),
    );

    const upCount = results.filter((r) => r.status === "up").length;
    const downCount = results.length - upCount;

    let status: AggregatedHealth["status"];
    if (downCount === 0) {
      status = "healthy";
    } else if (upCount === 0) {
      status = "unhealthy";
    } else {
      status = "degraded";
    }

    this.logger.log(`checkAll: completed - status=${status} up=${String(upCount)} down=${String(downCount)}`);

    return {
      status,
      timestamp: new Date().toISOString(),
      services: results,
      summary: {
        total: results.length,
        up: upCount,
        down: downCount,
      },
    };
  }

  private async checkService(name: string, url: string): Promise<ServiceHealthResult> {
    const start = Date.now();
    try {
      await httpGet(url, { timeout: HEALTH_CHECK_TIMEOUT_MS });
      return {
        name,
        status: "up",
        responseTimeMs: Date.now() - start,
        error: null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Health check failed for ${name}: ${message}`);
      return {
        name,
        status: "down",
        responseTimeMs: null,
        error: message,
      };
    }
  }
}
