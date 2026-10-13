import { IS_PUBLIC_KEY } from '@claw/shared-auth';
import { HealthCheckStatus } from '@claw/shared-types';

import { HealthController } from '../health.controller';

describe('HealthController', () => {
  it('delegates to the health service', async () => {
    const status = {
      status: HealthCheckStatus.OK,
      timestamp: '2026-10-13T00:00:00.000Z',
      service: 'plugin-service',
      database: 'up',
    };
    const health = { check: vi.fn().mockResolvedValue(status) };

    await expect(new HealthController(health as never).check()).resolves.toBe(status);
    expect(health.check).toHaveBeenCalledTimes(1);
  });

  it('is public so probes need no token', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, HealthController.prototype.check)).toBe(true);
  });
});
