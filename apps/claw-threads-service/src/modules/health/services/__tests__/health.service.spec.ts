import { HealthCheckStatus } from '@claw/shared-types';
import { THREADS_SERVICE } from '@claw/shared-constants';

import { HealthService } from '../health.service';

describe('HealthService', () => {
  it('reports the Threads service and owned database as healthy', async () => {
    const prisma = { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const result = await new HealthService(prisma as never).check();

    expect(result.status).toBe(HealthCheckStatus.OK);
    expect(result.service).toBe(THREADS_SERVICE);
    expect(result.database).toBe('up');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  it('reports down when the owned database cannot be reached', async () => {
    const prisma = { $queryRaw: vi.fn().mockRejectedValue(new Error('unavailable')) };
    const result = await new HealthService(prisma as never).check();

    expect(result.status).toBe(HealthCheckStatus.DOWN);
    expect(result.database).toBe('down');
  });
});
