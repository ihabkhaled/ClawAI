import { Test, type TestingModule } from '@nestjs/testing';
import { HealthController } from '../health.controller';
import { HealthService } from '../../services/health.service';
import { HealthCheckStatus, ServiceStatus } from '../../../../common/enums';

describe('HealthController', () => {
  let controller: HealthController;
  let serviceMock: jest.Mocked<{ check: jest.Mock }>;

  beforeEach(async () => {
    serviceMock = { check: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: serviceMock }],
    }).compile();
    controller = module.get<HealthController>(HealthController);
  });

  it('forwards to HealthService.check', async () => {
    const expected = {
      status: HealthCheckStatus.OK,
      timestamp: '2026-04-26T20:00:00.000Z',
      services: { mongodb: ServiceStatus.UP, redis: ServiceStatus.UP },
    };
    serviceMock.check.mockResolvedValue(expected);
    const result = await controller.check();
    expect(result).toBe(expected);
  });
});
