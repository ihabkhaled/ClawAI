import { vi } from 'vitest';
import { ServiceStatus } from '@claw/shared-types';

import { AggregatedHealthStatus } from '../../enums/aggregated-health-status.enum';
import { type AggregatedHealth } from '../../types/health.types';
import { type HealthService } from '../health.service';
import { MetricsService } from '../metrics.service';

const health = (overrides: Partial<AggregatedHealth> = {}): AggregatedHealth => ({
  status: AggregatedHealthStatus.DEGRADED,
  timestamp: '2026-09-20T00:00:00.000Z',
  services: [
    { name: 'auth-service', status: ServiceStatus.UP, responseTimeMs: 12, error: null },
    { name: 'chat-service', status: ServiceStatus.DOWN, responseTimeMs: null, error: 'timeout' },
  ],
  summary: { total: 2, up: 1, down: 1 },
  ...overrides,
});

const build = (): { service: MetricsService; checkAll: ReturnType<typeof vi.fn> } => {
  const checkAll = vi.fn().mockResolvedValue(health());
  return {
    service: new MetricsService({ checkAll } as unknown as HealthService),
    checkAll,
  };
};

describe('MetricsService', () => {
  it('reports up as 1, down as 0, and the response time only when measured', async () => {
    const { service } = build();

    const text = await service.render(1_000);

    expect(text).toContain('claw_service_up{service="auth-service"} 1');
    expect(text).toContain('claw_service_up{service="chat-service"} 0');
    expect(text).toContain('claw_service_response_ms{service="auth-service"} 12');
    expect(text).not.toContain('claw_service_response_ms{service="chat-service"}');
    expect(text).toContain('claw_services_total 2');
    expect(text).toContain('claw_services_up 1');
  });

  // The whole reason the cache exists: checkAll() calls all 17 services, and a
  // 15 s scrape would otherwise add ~98,000 outbound requests a day.
  it('serves a scrape from the cache instead of fanning out again', async () => {
    const { service, checkAll } = build();

    await service.render(1_000);
    await service.render(5_000);
    await service.render(14_999);

    expect(checkAll).toHaveBeenCalledOnce();
  });

  it('refreshes once the snapshot is older than the TTL', async () => {
    const { service, checkAll } = build();

    await service.render(1_000);
    await service.render(15_001);

    expect(checkAll).toHaveBeenCalledTimes(2);
  });

  it('reports the age of the snapshot it served', async () => {
    const { service } = build();

    await service.render(1_000);

    expect(await service.render(4_000)).toContain('claw_health_snapshot_age_ms 3000');
  });

  it('lets two scrapes arriving together share one fan-out', async () => {
    const checkAll = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });
      return health();
    });
    const service = new MetricsService({ checkAll } as unknown as HealthService);

    await Promise.all([service.render(1_000), service.render(1_001)]);

    expect(checkAll).toHaveBeenCalledOnce();
  });
});
