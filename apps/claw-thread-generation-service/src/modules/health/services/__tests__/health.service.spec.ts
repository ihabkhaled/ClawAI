import { HealthCheckStatus, ServiceStatus } from '@claw/shared-types';
import { THREAD_GENERATION_SERVICE } from '@claw/shared-constants';

import { HealthService } from '../health.service';

describe('HealthService', () => {
  it('reports the generation service as healthy', async () => {
    const prisma = { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const result = await new HealthService(prisma as never).check();

    expect(result.status).toBe(HealthCheckStatus.OK);
    expect(result.service).toBe(THREAD_GENERATION_SERVICE);
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
    expect(result.services.database).toBe(ServiceStatus.UP);
  });

  it('reports a degraded status when the database is unavailable', async () => {
    const prisma = { $queryRaw: vi.fn().mockRejectedValue(new Error('offline')) };

    const result = await new HealthService(prisma as never).check();

    expect(result.status).toBe(HealthCheckStatus.DEGRADED);
    expect(result.services.database).toBe(ServiceStatus.DOWN);
  });
});
