import { type Mock, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { HealthService } from '../health.service';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { RedisService } from '../../../../infrastructure/redis/redis.service';
import { ClamavClient } from '../../../../infrastructure/clamav/clamav.client';
import { HealthCheckStatus, ServiceStatus } from '../../../../common/enums';

describe('HealthService', () => {
  let prismaMock: { $queryRaw: Mock };
  let redisMock: { getClient: Mock };
  let clamavMock: { ping: Mock };

  const buildService = async (): Promise<HealthService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisService, useValue: redisMock },
        { provide: ClamavClient, useValue: clamavMock },
      ],
    }).compile();
    return module.get<HealthService>(HealthService);
  };

  beforeEach(() => {
    prismaMock = { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) };
    redisMock = {
      getClient: vi.fn().mockReturnValue({
        ping: vi.fn().mockResolvedValue('PONG'),
      }),
    };
    clamavMock = { ping: vi.fn().mockResolvedValue(true) };
  });

  // Contract read by health-service's fan-out (antivirus status component).
  it('reports clamav UP when clamd answers PONG', async () => {
    const service = await buildService();
    const result = await service.check();
    expect(result.status).toBe(HealthCheckStatus.OK);
    expect(result.services).toEqual({
      database: ServiceStatus.UP,
      redis: ServiceStatus.UP,
      clamav: ServiceStatus.UP,
    });
  });

  it('is DEGRADED (never DOWN, never throws) when only clamd is unreachable', async () => {
    clamavMock.ping.mockResolvedValue(false);
    const service = await buildService();
    const result = await service.check();
    expect(result.status).toBe(HealthCheckStatus.DEGRADED);
    expect(result.services.clamav).toBe(ServiceStatus.DOWN);
  });

  it('reports clamav DISABLED (and stays OK) when scanning is turned off', async () => {
    clamavMock.ping.mockResolvedValue(null);
    const service = await buildService();
    const result = await service.check();
    expect(result.status).toBe(HealthCheckStatus.OK);
    expect(result.services.clamav).toBe(ServiceStatus.DISABLED);
  });

  it('carries no host, port or error text in the payload', async () => {
    clamavMock.ping.mockResolvedValue(false);
    const service = await buildService();
    const body = JSON.stringify(await service.check());
    expect(body).not.toMatch(/\d+\.\d+\.\d+\.\d+|3310|ECONN/);
  });

  it('returns OK when both up', async () => {
    const service = await buildService();
    expect((await service.check()).status).toBe(HealthCheckStatus.OK);
  });

  it('returns DOWN when both down', async () => {
    prismaMock.$queryRaw = vi.fn().mockRejectedValue(new Error('db'));
    redisMock.getClient = vi.fn().mockReturnValue({
      ping: vi.fn().mockRejectedValue(new Error('redis')),
    });
    const service = await buildService();
    expect((await service.check()).status).toBe(HealthCheckStatus.DOWN);
  });

  it('returns DEGRADED when only redis down', async () => {
    redisMock.getClient = vi.fn().mockReturnValue({
      ping: vi.fn().mockResolvedValue('not-pong'),
    });
    const service = await buildService();
    const result = await service.check();
    expect(result.status).toBe(HealthCheckStatus.DEGRADED);
    expect(result.services.database).toBe(ServiceStatus.UP);
  });

  it('returns DEGRADED when only db down', async () => {
    prismaMock.$queryRaw = vi.fn().mockRejectedValue(new Error('db'));
    const service = await buildService();
    const result = await service.check();
    expect(result.status).toBe(HealthCheckStatus.DEGRADED);
    expect(result.services.redis).toBe(ServiceStatus.UP);
  });

  it('emits ISO timestamp', async () => {
    const service = await buildService();
    const result = await service.check();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
