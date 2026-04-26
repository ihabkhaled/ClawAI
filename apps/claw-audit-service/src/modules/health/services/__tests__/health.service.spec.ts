import { Test, type TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { HealthService } from '../health.service';
import { RedisService } from '../../../../infrastructure/redis/redis.service';
import { HealthCheckStatus, ServiceStatus } from '../../../../common/enums';

describe('HealthService', () => {
  let connectionMock: { readyState: number };
  let redisMock: { getClient: jest.Mock };

  const buildService = async (): Promise<HealthService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: getConnectionToken(), useValue: connectionMock },
        { provide: RedisService, useValue: redisMock },
      ],
    }).compile();
    return module.get<HealthService>(HealthService);
  };

  beforeEach(() => {
    connectionMock = { readyState: 1 };
    redisMock = {
      getClient: jest.fn().mockReturnValue({
        ping: jest.fn().mockResolvedValue('PONG'),
      }),
    };
  });

  it('returns OK when both up', async () => {
    const service = await buildService();
    const result = await service.check();
    expect(result.status).toBe(HealthCheckStatus.OK);
    expect(result.services.mongodb).toBe(ServiceStatus.UP);
    expect(result.services.redis).toBe(ServiceStatus.UP);
  });

  it('returns DOWN when both down', async () => {
    connectionMock.readyState = 0;
    redisMock.getClient = jest.fn().mockReturnValue({
      ping: jest.fn().mockRejectedValue(new Error('redis off')),
    });
    const service = await buildService();
    expect((await service.check()).status).toBe(HealthCheckStatus.DOWN);
  });

  it('returns DEGRADED when only redis is down', async () => {
    redisMock.getClient = jest.fn().mockReturnValue({
      ping: jest.fn().mockResolvedValue('not pong'),
    });
    const service = await buildService();
    const result = await service.check();
    expect(result.status).toBe(HealthCheckStatus.DEGRADED);
    expect(result.services.redis).toBe(ServiceStatus.DOWN);
  });

  it('returns DEGRADED when only mongo is down', async () => {
    connectionMock.readyState = 0;
    const service = await buildService();
    const result = await service.check();
    expect(result.status).toBe(HealthCheckStatus.DEGRADED);
    expect(result.services.mongodb).toBe(ServiceStatus.DOWN);
  });

  it('emits ISO timestamp', async () => {
    const service = await buildService();
    const result = await service.check();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
