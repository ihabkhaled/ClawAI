import { BillingGateway } from '@claw/shared-types';

import { HealthController } from '../health.controller';
import type { HealthService } from '../health.service';
import type { HealthReport } from '../types/health.types';

describe('HealthController', () => {
  const report: HealthReport = {
    status: 'ok',
    service: 'payment-service',
    database: 'ok',
    gateways: [{ gateway: BillingGateway.PAYPAL, configured: false, mode: 'sandbox' }],
  };

  it('delegates to the service and returns its report unchanged', async () => {
    const healthService = { report: jest.fn(async () => report) } as unknown as HealthService;
    const controller = new HealthController(healthService);

    await expect(controller.check()).resolves.toBe(report);
    expect(healthService.report).toHaveBeenCalledTimes(1);
  });

  it('propagates a service failure rather than masking it as healthy', async () => {
    const healthService = {
      report: jest.fn(() => Promise.reject(new Error('boom'))),
    } as unknown as HealthService;
    const controller = new HealthController(healthService);

    await expect(controller.check()).rejects.toThrow('boom');
  });
});
