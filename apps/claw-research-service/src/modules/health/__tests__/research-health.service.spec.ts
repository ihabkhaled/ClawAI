import { type Mock, vi } from 'vitest';

import { SidecarHealthState } from '../../fetch/enums/sidecar-health-state.enum';
import { ResearchHealthStatus } from '../enums/research-health-status.enum';
import { HealthController } from '../health.controller';
import { ResearchHealthService } from '../services/research-health.service';

// Contract with health-service (apps/claw-health-service DEPENDENCY_PROBES):
// it reads `services.crawl4ai|flaresolverr|firecrawl` = 'up'|'down'|'disabled'
// from this exact body. Changing a key or a value here breaks its rows.
describe('research-service /health', () => {
  let report: Mock;
  let controller: HealthController;

  beforeEach(() => {
    report = vi.fn();
    controller = new HealthController(new ResearchHealthService({ report } as never));
  });

  it('is ok with every sidecar disabled (the seeded default)', async () => {
    report.mockResolvedValue({
      crawl4ai: SidecarHealthState.DISABLED,
      flaresolverr: SidecarHealthState.DISABLED,
      firecrawl: SidecarHealthState.DISABLED,
    });

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      service: 'research-service',
      services: { crawl4ai: 'disabled', flaresolverr: 'disabled', firecrawl: 'disabled' },
    });
  });

  it('is degraded, never down, when an enabled sidecar does not answer', async () => {
    report.mockResolvedValue({
      crawl4ai: SidecarHealthState.UP,
      flaresolverr: SidecarHealthState.DOWN,
      firecrawl: SidecarHealthState.DISABLED,
    });

    const body = await controller.check();

    expect(body.status).toBe(ResearchHealthStatus.DEGRADED);
    expect(body.services).toEqual({ crawl4ai: 'up', flaresolverr: 'down', firecrawl: 'disabled' });
  });

  it('is ok with no sidecar keys when the config table was unreadable', async () => {
    report.mockResolvedValue({});

    await expect(controller.check()).resolves.toMatchObject({ status: 'ok', services: {} });
  });
});
