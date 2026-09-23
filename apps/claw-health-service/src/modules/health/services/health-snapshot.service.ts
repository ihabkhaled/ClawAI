import { Injectable, Logger } from '@nestjs/common';

import { METRICS_SNAPSHOT_TTL_MS } from '../constants/metrics.constants';
import { type HealthSnapshot } from '../types/metrics.types';
import { HealthService } from './health.service';

/**
 * The one cached health fan-out that both the Prometheus exporter and the
 * status page read (ADR-113).
 *
 * `checkAll()` calls all 17 services. Without this cache every scrape and
 * every status-page load would be a fan-out of its own; with it, they all
 * share one measurement, refreshed when it is older than the TTL.
 */
@Injectable()
export class HealthSnapshotService {
  private readonly logger = new Logger(HealthSnapshotService.name);
  private snapshot: HealthSnapshot | null = null;
  private inFlight: Promise<HealthSnapshot> | null = null;

  constructor(private readonly healthService: HealthService) {}

  /**
   * The cached snapshot, refreshed when it is older than the TTL.
   *
   * Concurrent readers share one refresh: two arriving together would
   * otherwise both fan out to every service.
   */
  async current(now: number = Date.now()): Promise<HealthSnapshot> {
    if (this.snapshot && now - this.snapshot.takenAtMs < METRICS_SNAPSHOT_TTL_MS) {
      return this.snapshot;
    }
    this.inFlight ??= this.refresh(now).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async refresh(now: number): Promise<HealthSnapshot> {
    this.logger.debug('refresh: taking a health snapshot');
    const snapshot: HealthSnapshot = {
      health: await this.healthService.checkAll(),
      takenAtMs: now,
    };
    this.snapshot = snapshot;
    return snapshot;
  }
}
