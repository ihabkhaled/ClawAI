import { Test, type TestingModule } from '@nestjs/testing';
import { ServerLogsService } from '../server-logs.service';
import { ServerLogsRepository } from '../../repositories/server-logs.repository';
import { SortOrder } from '../../../../common/enums/sort-order.enum';

describe('ServerLogsService', () => {
  let service: ServerLogsService;
  let repo: jest.Mocked<ServerLogsRepository>;

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      createMany: jest.fn(),
      findAll: jest.fn(),
      countAll: jest.fn(),
      getDistinctValues: jest.fn(),
      getTimeSeries: jest.fn(),
      aggregateByLevel: jest.fn(),
      aggregateByService: jest.fn(),
      aggregateByAction: jest.fn(),
      aggregateByMethod: jest.fn(),
      aggregateByStatusCode: jest.fn(),
      aggregateByModule: jest.fn(),
      getErrorCount: jest.fn(),
      getAvgLatency: jest.fn(),
    } as unknown as jest.Mocked<ServerLogsRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ServerLogsService, { provide: ServerLogsRepository, useValue: repo }],
    }).compile();

    service = module.get<ServerLogsService>(ServerLogsService);
  });

  describe('createLog', () => {
    it('persists a log and returns the id', async () => {
      repo.create.mockResolvedValue({ _id: 'log-1' } as never);
      const result = await service.createLog({
        level: 'info',
        message: 'hello',
        serviceName: 'auth',
      });
      expect(result).toEqual({ id: 'log-1' });
    });

    it('rethrows repository errors', async () => {
      repo.create.mockRejectedValue(new Error('mongo down'));
      await expect(
        service.createLog({ level: 'error', message: 'x', serviceName: 's' }),
      ).rejects.toThrow('mongo down');
    });
  });

  describe('createMany', () => {
    it('returns inserted count from repository', async () => {
      repo.createMany.mockResolvedValue(7);
      const result = await service.createMany([
        { level: 'info', message: 'a', serviceName: 's1' },
        { level: 'warn', message: 'b', serviceName: 's2' },
      ]);
      expect(result).toEqual({ inserted: 7 });
    });

    it('rethrows repository errors', async () => {
      repo.createMany.mockRejectedValue(new Error('bulk fail'));
      await expect(service.createMany([])).rejects.toThrow('bulk fail');
    });
  });

  describe('getLogs', () => {
    it('returns paginated data with totalPages computed from total/limit', async () => {
      repo.findAll.mockResolvedValue([{ _id: '1' }] as never);
      repo.countAll.mockResolvedValue(50);
      const result = await service.getLogs({ page: 2, limit: 10 });
      expect(result.meta).toEqual({ total: 50, page: 2, limit: 10, totalPages: 5 });
    });

    it('defaults page=1 limit=20 when omitted', async () => {
      repo.findAll.mockResolvedValue([] as never);
      repo.countAll.mockResolvedValue(0);
      const result = await service.getLogs({});
      expect(result.meta).toMatchObject({ page: 1, limit: 20, totalPages: 0 });
    });

    it('forwards SortOrder.ASC filter', async () => {
      repo.findAll.mockResolvedValue([] as never);
      repo.countAll.mockResolvedValue(0);
      await service.getLogs({ sortOrder: SortOrder.ASC });
      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: SortOrder.ASC }),
      );
    });

    it('rethrows repository errors', async () => {
      repo.findAll.mockRejectedValue(new Error('boom'));
      repo.countAll.mockResolvedValue(0);
      await expect(service.getLogs({})).rejects.toThrow('boom');
    });
  });

  describe('getStats', () => {
    it('aggregates across 6 dimensions plus total/error/avgLatency', async () => {
      repo.aggregateByLevel.mockResolvedValue([{ _id: 'info', count: 10 }]);
      repo.aggregateByService.mockResolvedValue([{ _id: 'auth', count: 5 }]);
      repo.aggregateByAction.mockResolvedValue([{ _id: 'login', count: 3 }]);
      repo.aggregateByMethod.mockResolvedValue([{ _id: 'POST', count: 2 }]);
      repo.aggregateByStatusCode.mockResolvedValue([{ _id: '200', count: 8 }]);
      repo.aggregateByModule.mockResolvedValue([{ _id: 'auth', count: 4 }]);
      repo.countAll.mockResolvedValue(100);
      repo.getErrorCount.mockResolvedValue(7);
      repo.getAvgLatency.mockResolvedValue(42);

      const result = await service.getStats();

      expect(result.total).toBe(100);
      expect(result.errorCount).toBe(7);
      expect(result.avgLatencyMs).toBe(42);
      expect(result.byLevel).toHaveLength(1);
      expect(result.byService).toHaveLength(1);
      expect(result.byAction).toHaveLength(1);
      expect(result.byMethod).toHaveLength(1);
      expect(result.byStatusCode).toHaveLength(1);
      expect(result.byModule).toHaveLength(1);
    });

    it('rethrows repository errors', async () => {
      repo.aggregateByLevel.mockRejectedValue(new Error('agg fail'));
      await expect(service.getStats()).rejects.toThrow('agg fail');
    });
  });

  describe('getDistinctValues', () => {
    it('forwards field and filters', async () => {
      repo.getDistinctValues.mockResolvedValue({ field: 'serviceName', values: ['auth'] });
      const result = await service.getDistinctValues('serviceName', { userId: 'u1' });
      expect(repo.getDistinctValues).toHaveBeenCalledWith('serviceName', { userId: 'u1' });
      expect(result).toEqual({ field: 'serviceName', values: ['auth'] });
    });

    it('rethrows repository errors', async () => {
      repo.getDistinctValues.mockRejectedValue(new Error('dist fail'));
      await expect(service.getDistinctValues('x', {})).rejects.toThrow('dist fail');
    });
  });

  describe('getTimeSeries', () => {
    it('forwards filters and intervalMinutes', async () => {
      const buckets = [{ timestamp: '2026-01-01T00:00:00Z', count: 5 }];
      repo.getTimeSeries.mockResolvedValue(buckets);
      const result = await service.getTimeSeries({}, 15);
      expect(repo.getTimeSeries).toHaveBeenCalledWith({}, 15);
      expect(result).toBe(buckets);
    });

    it('rethrows repository errors', async () => {
      repo.getTimeSeries.mockRejectedValue(new Error('ts fail'));
      await expect(service.getTimeSeries({}, 5)).rejects.toThrow('ts fail');
    });
  });
});
