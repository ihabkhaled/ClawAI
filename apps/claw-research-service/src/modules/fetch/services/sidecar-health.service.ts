import { Injectable, Logger } from '@nestjs/common';

import {
  SIDECAR_HEALTH_CACHE_TTL_MS,
  SIDECAR_HEALTH_PROBES,
  SIDECAR_HEALTH_TIMEOUT_MS,
} from '../constants/fetch-strategy.constants';
import { SidecarHealthState } from '../enums/sidecar-health-state.enum';
import { FetchStrategyConfigRepository } from '../repositories/fetch-strategy-config.repository';
import { publicConfigOf } from '../utilities/escalation-helpers.utility';
import { probeSidecarReachable } from '../utilities/sidecar-client.utility';
import { resolveStrategyBaseUrl } from '../utilities/strategy-config.utility';
import type { FetchStrategyConfig, FetchStrategyKind } from '../../../generated/prisma';
import type {
  CachedSidecarHealth,
  SidecarHealthProbe,
  SidecarHealthReport,
} from '../types/sidecar.types';

/**
 * The scraping sidecars' health, for research-service `/health` (ADR-121
 * addendum). Read from `fetch_strategy_configs`: a sidecar whose row is
 * disabled (or missing) is DISABLED and is never probed; an enabled one gets
 * one cheap GET with a short timeout and is UP or DOWN.
 *
 * The report is cached for `SIDECAR_HEALTH_CACHE_TTL_MS`, and concurrent
 * callers share one in-flight read, so `/health` polling never becomes a
 * probe storm against the sidecars.
 */
@Injectable()
export class SidecarHealthService {
  private readonly logger = new Logger(SidecarHealthService.name);
  private cached: CachedSidecarHealth | null = null;
  private inFlight: Promise<SidecarHealthReport> | null = null;

  constructor(private readonly configs: FetchStrategyConfigRepository) {}

  async report(now: number = Date.now()): Promise<SidecarHealthReport> {
    if (this.cached !== null && now < this.cached.expiresAtMs) {
      return this.cached.report;
    }
    this.inFlight ??= this.measure()
      .then((report) => {
        this.cached = { report, expiresAtMs: now + SIDECAR_HEALTH_CACHE_TTL_MS };
        return report;
      })
      .finally(() => {
        this.inFlight = null;
      });
    return this.inFlight;
  }

  private async measure(): Promise<SidecarHealthReport> {
    let rows: FetchStrategyConfig[];
    try {
      rows = await this.configs.listAll();
    } catch (error: unknown) {
      // Not measured: no key at all, so health-service shows no row rather than an outage.
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`measure: fetch strategy configs unreadable — ${message}`);
      return {};
    }
    const byKind = new Map(rows.map((row) => [row.kind, row] as const));
    const entries = await Promise.all(
      SIDECAR_HEALTH_PROBES.map(
        async (probe) => [probe.key, await this.stateOf(probe, byKind)] as const,
      ),
    );
    return Object.fromEntries(entries);
  }

  private async stateOf(
    probe: SidecarHealthProbe,
    byKind: ReadonlyMap<FetchStrategyKind, FetchStrategyConfig>,
  ): Promise<SidecarHealthState> {
    const row = byKind.get(probe.kind);
    if (row?.enabled !== true) {
      return SidecarHealthState.DISABLED;
    }
    let baseUrl: string;
    try {
      baseUrl = resolveStrategyBaseUrl(publicConfigOf(row), probe.defaultBaseUrl);
    } catch {
      return SidecarHealthState.DOWN;
    }
    const reachable = await probeSidecarReachable(baseUrl, probe.path, SIDECAR_HEALTH_TIMEOUT_MS);
    if (!reachable) {
      this.logger.warn(`stateOf: sidecar ${probe.key} enabled but not answering`);
    }
    return reachable ? SidecarHealthState.UP : SidecarHealthState.DOWN;
  }
}
