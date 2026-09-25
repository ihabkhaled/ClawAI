import { Injectable, Logger } from '@nestjs/common';
import { ServiceStatus } from '@claw/shared-types';
import { httpGet } from '@common/utilities';
import {
  DEPENDENCY_PROBES,
  HEALTH_CHECK_TIMEOUT_MS,
  SERVICE_URLS,
} from '../constants/health.constants';
import {
  type AggregatedHealth,
  type AggregatedHealthSummary,
  type ServiceCheckOutcome,
  type ServiceHealthResult,
} from '../types/health.types';
import { deriveDependencyResults } from '../utilities/dependency-health.utility';
import { AggregatedHealthStatus } from '../enums/aggregated-health-status.enum';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  /** The last status logged, so only a CHANGE is worth an INFO line. */
  private lastStatus: AggregatedHealthStatus | null = null;

  async checkAll(): Promise<AggregatedHealth> {
    this.logger.debug(`checkAll: input services=${String(Object.keys(SERVICE_URLS).length)}`);
    try {
      const entries = Object.entries(SERVICE_URLS);
      const outcomes = await Promise.all(
        entries.map(([name, url]) => this.checkService(name, url)),
      );
      // Dependencies a service reports in its own body (ClamAV via
      // file-service) become rows of their own: a status component, a
      // `claw_service_up` series and uptime history, with no extra request.
      const bodiesBySource = new Map(
        outcomes
          .filter((outcome) => outcome.result.status === ServiceStatus.UP)
          .map((outcome) => [outcome.result.name, outcome.body] as const),
      );
      const results = [
        ...outcomes.map((outcome) => outcome.result),
        ...deriveDependencyResults(DEPENDENCY_PROBES, bodiesBySource),
      ];
      const summary = this.summarise(results);
      const status = this.deriveStatus(summary);

      // Every check used to log at INFO. The container healthcheck alone runs
      // one every 15 s, and since the Prometheus exporter (ADR-113) scrapes on
      // the same cadence that is ~11,500 identical lines a day shipped into
      // the log store, where they bury the ones that mean something. A change
      // of status is the event; a repeat of it is not.
      const line = `checkAll: completed status=${status} up=${String(summary.up)} down=${String(summary.down)}`;
      if (status === this.lastStatus) {
        this.logger.debug(line);
      } else {
        this.logger.log(`${line} (was ${this.lastStatus ?? 'unknown'})`);
        this.lastStatus = status;
      }

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
    return summary.up === 0 ? AggregatedHealthStatus.UNHEALTHY : AggregatedHealthStatus.DEGRADED;
  }

  private async checkService(name: string, url: string): Promise<ServiceCheckOutcome> {
    this.logger.debug(`checkService: name=${name} url=${url}`);
    const start = Date.now();
    try {
      const body = await httpGet<unknown>(url, { timeout: HEALTH_CHECK_TIMEOUT_MS });
      const responseTimeMs = Date.now() - start;
      this.logger.debug(`checkService: name=${name} ok responseTimeMs=${String(responseTimeMs)}`);
      return {
        result: { name, status: ServiceStatus.UP, responseTimeMs, error: null },
        body,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`checkService: name=${name} down — ${message}`);
      return {
        result: { name, status: ServiceStatus.DOWN, responseTimeMs: null, error: message },
        body: null,
      };
    }
  }
}
