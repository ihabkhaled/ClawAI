import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { SERVICE_URLS, HEALTH_CHECK_TIMEOUT_MS } from "../constants/health.constants";
import { AggregatedHealth, ServiceHealthResult } from "../types/health.types";

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  async checkAll(): Promise<AggregatedHealth> {
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
      await axios.get(url, { timeout: HEALTH_CHECK_TIMEOUT_MS });
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
