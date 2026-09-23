import { vi } from 'vitest';
import { ServiceStatus } from '@claw/shared-types';

import { PrometheusAdapter } from '../../adapters/prometheus.adapter';
import {
  STATUS_HISTORY_FAILURE_TTL_MS,
  STATUS_HISTORY_TTL_MS,
} from '../../constants/status-page.constants';
import { AggregatedHealthStatus } from '../../enums/aggregated-health-status.enum';
import { ComponentState } from '../../enums/component-state.enum';
import { StatusComponent } from '../../enums/status-component.enum';
import { StatusHistoryManager } from '../../managers/status-history.manager';
import { type AggregatedHealth } from '../../types/health.types';
import { type StatusHistory } from '../../types/status-page.types';
import { HealthSnapshotService } from '../health-snapshot.service';
import { HealthService } from '../health.service';
import { StatusPageService } from '../status-page.service';

const health: AggregatedHealth = {
  status: AggregatedHealthStatus.DEGRADED,
  timestamp: '2026-09-23T00:00:00.000Z',
  services: [
    { name: 'auth-service', status: ServiceStatus.UP, responseTimeMs: 9, error: null },
    {
      name: 'payment-service',
      status: ServiceStatus.DOWN,
      responseTimeMs: null,
      error: 'getaddrinfo ENOTFOUND payment-service:4018',
    },
  ],
  summary: { total: 2, up: 1, down: 1 },
};

const emptyHistory: StatusHistory = { components: [], incidents: [] };

const build = () => {
  const healthService = new HealthService();
  const checkAll = vi.spyOn(healthService, 'checkAll').mockResolvedValue(health);
  const manager = new StatusHistoryManager(new PrometheusAdapter());
  const read = vi.spyOn(manager, 'read').mockResolvedValue(emptyHistory);
  const service = new StatusPageService(new HealthSnapshotService(healthService), manager);
  return { service, checkAll, read };
};

describe('StatusPageService', () => {
  it('reports the live state per component from the health snapshot', async () => {
    const { service } = build();

    const page = await service.getStatus(1_000);

    const state = (component: StatusComponent) =>
      page.components.find((entry) => entry.component === component)?.state;
    expect(state(StatusComponent.ACCOUNTS)).toBe(ComponentState.UP);
    expect(state(StatusComponent.PAYMENTS)).toBe(ComponentState.DOWN);
    expect(state(StatusComponent.CHAT)).toBe(ComponentState.UNKNOWN);
    expect(page.historyAvailable).toBe(true);
  });

  it('reuses one history read for the whole TTL', async () => {
    const { service, read } = build();

    await service.getStatus(1_000);
    await service.getStatus(1_000 + STATUS_HISTORY_TTL_MS - 1);
    expect(read).toHaveBeenCalledOnce();

    await service.getStatus(1_000 + STATUS_HISTORY_TTL_MS);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('shares the snapshot with the exporter instead of fanning out per page load', async () => {
    const { service, checkAll } = build();

    await service.getStatus(1_000);
    await service.getStatus(2_000);

    expect(checkAll).toHaveBeenCalledOnce();
  });

  it('lets concurrent page loads share one history read', async () => {
    const { service, read } = build();

    await Promise.all([service.getStatus(1_000), service.getStatus(1_001)]);

    expect(read).toHaveBeenCalledOnce();
  });

  // One attempt, then a pause: no retry storm against a Prometheus that is down.
  it('caches a failed read for the failure TTL, then tries once more', async () => {
    const { service, read } = build();
    read.mockRejectedValue(new Error('connect ECONNREFUSED prometheus:9090'));

    const page = await service.getStatus(1_000);
    await service.getStatus(1_000 + STATUS_HISTORY_FAILURE_TTL_MS - 1);

    expect(page.historyAvailable).toBe(false);
    expect(read).toHaveBeenCalledOnce();

    await service.getStatus(1_000 + STATUS_HISTORY_FAILURE_TTL_MS);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('never returns the failure or a health error message to the caller', async () => {
    const { service, read } = build();
    read.mockRejectedValue(new Error('connect ECONNREFUSED prometheus:9090'));

    const json = JSON.stringify(await service.getStatus(1_000));

    expect(json).not.toMatch(/prometheus|9090|ECONNREFUSED|ENOTFOUND|4018|-service/i);
  });
});
