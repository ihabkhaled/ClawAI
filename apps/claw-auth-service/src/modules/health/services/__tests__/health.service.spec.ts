import { Test, type TestingModule } from '@nestjs/testing';
import { HealthService } from '../health.service';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { RedisService } from '../../../../infrastructure/redis/redis.service';
import { HealthCheckStatus, ServiceStatus } from '../../../../common/enums';

describe('HealthService', () => {
  let prismaMock: { $queryRaw: jest.Mock };
  let redisMock: { getClient: jest.Mock };

  const buildService = async (): Promise<HealthService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisService, useValue: redisMock },
      ],
    }).compile();
    return module.get<HealthService>(HealthService);
  };

  beforeEach(() => {
    prismaMock = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    redisMock = {
      getClient: jest.fn().mockReturnValue({
        ping: jest.fn().mockResolvedValue('PONG'),
      }),
    };
  });

  it('returns OK when DB and redis are both up', async () => {
    const service = await buildService();
    const result = await service.check();
    expect(result.status).toBe(HealthCheckStatus.OK);
    expect(result.services.database).toBe(ServiceStatus.UP);
    expect(result.services.redis).toBe(ServiceStatus.UP);
  });

  it('returns DOWN when both are down', async () => {
    prismaMock.$queryRaw = jest.fn().mockRejectedValue(new Error('db off'));
    redisMock.getClient = jest.fn().mockReturnValue({
      ping: jest.fn().mockRejectedValue(new Error('redis off')),
    });
    const service = await buildService();
    expect((await service.check()).status).toBe(HealthCheckStatus.DOWN);
  });

  it('returns DEGRADED when only redis is down', async () => {
    redisMock.getClient = jest.fn().mockReturnValue({
      ping: jest.fn().mockResolvedValue('not-pong'),
    });
    const service = await buildService();
    const result = await service.check();
    expect(result.status).toBe(HealthCheckStatus.DEGRADED);
    expect(result.services.database).toBe(ServiceStatus.UP);
    expect(result.services.redis).toBe(ServiceStatus.DOWN);
  });

  it('returns DEGRADED when only DB is down', async () => {
    prismaMock.$queryRaw = jest.fn().mockRejectedValue(new Error('db off'));
    const service = await buildService();
    const result = await service.check();
    expect(result.status).toBe(HealthCheckStatus.DEGRADED);
    expect(result.services.database).toBe(ServiceStatus.DOWN);
  });

  it('emits ISO timestamp', async () => {
    const service = await buildService();
    const result = await service.check();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
