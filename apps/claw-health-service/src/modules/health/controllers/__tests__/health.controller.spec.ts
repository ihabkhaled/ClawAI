import { type Mock, vi } from 'vitest';
import { verifyUserAccessToken } from '@claw/shared-utilities';
import { Test, type TestingModule } from '@nestjs/testing';
import { ServiceStatus, UserRole } from '@claw/shared-types';
import { HealthController } from '../health.controller';
import { HealthService } from '../../services/health.service';
import { AggregatedHealthStatus } from '../../enums/aggregated-health-status.enum';

vi.mock('@claw/shared-utilities', () => ({ verifyUserAccessToken: vi.fn() }));

describe('HealthController', () => {
  let controller: HealthController;
  let serviceMock: { checkAll: Mock };

  beforeEach(async () => {
    serviceMock = { checkAll: vi.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: serviceMock }],
    }).compile();
    controller = module.get<HealthController>(HealthController);
  });

  const full = {
    status: AggregatedHealthStatus.DEGRADED,
    timestamp: '2026-04-26T20:00:00.000Z',
    services: [
      {
        name: 'auth-service',
        status: ServiceStatus.DOWN,
        responseTimeMs: null,
        error: 'getaddrinfo ENOTFOUND auth-service',
      },
    ],
    summary: { total: 1, up: 0, down: 1 },
    disabledDependencies: [],
  };

  it('gives anonymous callers status and up/down only', async () => {
    serviceMock.checkAll.mockResolvedValue(full);
    const result = await controller.check(undefined);
    expect(serviceMock.checkAll).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain('ENOTFOUND');
    expect(result).toMatchObject({
      status: AggregatedHealthStatus.DEGRADED,
      services: [{ name: 'auth-service', status: ServiceStatus.DOWN, error: null }],
    });
  });

  it('gives an admin bearer token the full report', async () => {
    process.env['JWT_SECRET'] = 'secret';
    (verifyUserAccessToken as unknown as Mock).mockReturnValue({ role: UserRole.ADMIN });
    serviceMock.checkAll.mockResolvedValue(full);
    const result = await controller.check('Bearer tok');
    expect(result).toBe(full);
  });

  it('propagates errors from the service', async () => {
    serviceMock.checkAll.mockRejectedValue(new Error('boom'));
    await expect(controller.check(undefined)).rejects.toThrow('boom');
  });
});
