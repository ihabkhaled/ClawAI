import { Test, type TestingModule } from '@nestjs/testing';
import { ServiceStatus } from '@claw/shared-types';
import { HealthController } from '../health.controller';
import { HealthService } from '../../services/health.service';
import { AggregatedHealthStatus } from '../../enums/aggregated-health-status.enum';

describe('HealthController', () => {
  let controller: HealthController;
  let serviceMock: { checkAll: jest.Mock };

  beforeEach(async () => {
    serviceMock = { checkAll: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: serviceMock }],
    }).compile();
    controller = module.get<HealthController>(HealthController);
  });

  it('delegates to HealthService.checkAll', async () => {
    const expected = {
      status: AggregatedHealthStatus.HEALTHY,
      timestamp: '2026-04-26T20:00:00.000Z',
      services: [{ name: 'auth', status: ServiceStatus.UP, responseTimeMs: 12, error: null }],
      summary: { total: 1, up: 1, down: 0 },
    };
    serviceMock.checkAll.mockResolvedValue(expected);

    const result = await controller.check();

    expect(serviceMock.checkAll).toHaveBeenCalledTimes(1);
    expect(result).toBe(expected);
  });

  it('propagates errors from the service', async () => {
    serviceMock.checkAll.mockRejectedValue(new Error('boom'));
    await expect(controller.check()).rejects.toThrow('boom');
  });
});
