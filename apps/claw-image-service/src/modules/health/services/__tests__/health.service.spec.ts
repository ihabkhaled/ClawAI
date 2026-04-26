import { Test, type TestingModule } from '@nestjs/testing';
import { HealthService } from '../health.service';
import { RedisService } from '../../../../infrastructure/redis/redis.service';
import { HealthCheckStatus, ServiceStatus } from '../../../../common/enums';

describe('HealthService', () => {
  let redisMock: { getClient: jest.Mock };

  const buildService = async (): Promise<HealthService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService, { provide: RedisService, useValue: redisMock }],
    }).compile();
    return module.get<HealthService>(HealthService);
  };

  beforeEach(() => {
    redisMock = {
      getClient: jest.fn().mockReturnValue({
        ping: jest.fn().mockResolvedValue('PONG'),
      }),
    };
  });

  it('returns OK when redis pings PONG', async () => {
    const service = await buildService();
    expect((await service.check()).status).toBe(HealthCheckStatus.OK);
  });

  it('returns DEGRADED when redis returns wrong reply', async () => {
    redisMock.getClient = jest.fn().mockReturnValue({
      ping: jest.fn().mockResolvedValue('not-pong'),
    });
    const service = await buildService();
    const result = await service.check();
    expect(result.status).toBe(HealthCheckStatus.DEGRADED);
    expect(result.services.redis).toBe(ServiceStatus.DOWN);
  });

  it('returns DEGRADED when redis throws', async () => {
    redisMock.getClient = jest.fn().mockReturnValue({
      ping: jest.fn().mockRejectedValue(new Error('off')),
    });
    const service = await buildService();
    expect((await service.check()).status).toBe(HealthCheckStatus.DEGRADED);
  });

  it('emits ISO timestamp', async () => {
    const service = await buildService();
    expect(new Date((await service.check()).timestamp).toISOString()).toMatch(
      /^\d{4}-\d{2}-\d{2}T/,
    );
  });
});
