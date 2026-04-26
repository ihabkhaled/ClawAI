import { Injectable, Logger } from '@nestjs/common';
import { ServiceStatus } from '@claw/shared-types';
import { httpGet } from '@common/utilities';
import { HEALTH_CHECK_TIMEOUT_MS, SERVICE_URLS } from '../constants/health.constants';
import {
  type AggregatedHealth,
  type AggregatedHealthSummary,
  type ServiceHealthResult,
} from '../types/health.types';
import { AggregatedHealthStatus } from '../enums/aggregated-health-status.enum';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  async checkAll(): Promise<AggregatedHealth> {
    this.logger.debug(`checkAll: input services=${String(Object.keys(SERVICE_URLS).length)}`);
    try {
      const entries = Object.entries(SERVICE_URLS);
      const results = await Promise.all(entries.map(([name, url]) => this.checkService(name, url)));
      const summary = this.summarise(results);
      const status = this.deriveStatus(summary);

      this.logger.log(
        `checkAll: completed status=${status} up=${String(summary.up)} down=${String(summary.down)}`,
      );

      return {
        status,
        timestamp: new Date().toISOString(),
        services: results,
        summary,
      };
    } catch (error) {
      this.logger.error(`checkAll: failed — ${(error as Error).message}`);
      throw error;
    }
  }

  private summarise(results: ServiceHealthResult[]): AggregatedHealthSummary {
    const up = results.filter((r) => r.status === ServiceStatus.UP).length;
    return {
      total: results.length,
      up,
      down: results.length - up,
    };
  }

  private deriveStatus(summary: AggregatedHealthSummary): AggregatedHealthStatus {
    if (summary.down === 0) {
      return AggregatedHealthStatus.HEALTHY;
    }
    if (summary.up === 0) {
      return AggregatedHealthStatus.UNHEALTHY;
    }
    return AggregatedHealthStatus.DEGRADED;
  }

  private async checkService(name: string, url: string): Promise<ServiceHealthResult> {
    this.logger.debug(`checkService: name=${name} url=${url}`);
    const start = Date.now();
    try {
      await httpGet(url, { timeout: HEALTH_CHECK_TIMEOUT_MS });
      const responseTimeMs = Date.now() - start;
      this.logger.debug(`checkService: name=${name} ok responseTimeMs=${String(responseTimeMs)}`);
      return {
        name,
        status: ServiceStatus.UP,
        responseTimeMs,
        error: null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`checkService: name=${name} down — ${message}`);
      return {
        name,
        status: ServiceStatus.DOWN,
        responseTimeMs: null,
        error: message,
      };
    }
  }
}
