import { Injectable, Logger } from '@nestjs/common';

import {
  STATUS_HISTORY_FAILURE_TTL_MS,
  STATUS_HISTORY_TTL_MS,
} from '../constants/status-page.constants';
import { StatusHistoryManager } from '../managers/status-history.manager';
import {
  type CachedHistory,
  type StatusHistory,
  type StatusPageResponse,
} from '../types/status-page.types';
import { composeStatusPage, currentComponentStates } from '../utilities/status-aggregation.utility';
import { HealthSnapshotService } from './health-snapshot.service';

/**
 * The status page (observability plan B3): each component's state now, its
 * uptime over 24 h / 7 d / 30 d, and the last week's incidents.
 *
 * "Now" is the cached health snapshot the exporter already keeps, so a page
 * load is never a fan-out of its own. History comes from Prometheus, cached
 * for a minute; a failed read is cached too, so a Prometheus outage shows as
 * "history unavailable" instead of making every page load wait on a timeout.
 */
@Injectable()
export class StatusPageService {
  private readonly logger = new Logger(StatusPageService.name);
  private cached: CachedHistory | null = null;
  private inFlight: Promise<StatusHistory | null> | null = null;

  constructor(
    private readonly snapshots: HealthSnapshotService,
    private readonly historyManager: StatusHistoryManager,
  ) {}

  async getStatus(now: number = Date.now()): Promise<StatusPageResponse> {
    const [snapshot, history] = await Promise.all([
      this.snapshots.current(now),
      this.historyFor(now),
    ]);
    return composeStatusPage(
      currentComponentStates(snapshot.health.services, snapshot.health.disabledDependencies),
      history,
      now,
    );
  }

  private async historyFor(now: number): Promise<StatusHistory | null> {
    if (this.cached && now < this.cached.expiresAtMs) {
      return this.cached.history;
    }
    this.inFlight ??= this.readHistory(now).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async readHistory(now: number): Promise<StatusHistory | null> {
    try {
      const history = await this.historyManager.read(now);
      this.cached = { history, expiresAtMs: now + STATUS_HISTORY_TTL_MS };
      return history;
    } catch (error: unknown) {
      // Logged, never returned: the message can name an internal host.
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`readHistory: prometheus unavailable — ${message}`);
      this.cached = { history: null, expiresAtMs: now + STATUS_HISTORY_FAILURE_TTL_MS };
      return null;
    }
  }
}
