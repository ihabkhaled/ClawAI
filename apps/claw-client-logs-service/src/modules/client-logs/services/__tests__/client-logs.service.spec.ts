import { Test, type TestingModule } from '@nestjs/testing';
import { ClientLogsService } from '../client-logs.service';
import { ClientLogsRepository } from '../../repositories/client-logs.repository';
import { SortOrder } from '../../../../common/enums/sort-order.enum';

describe('ClientLogsService', () => {
  let service: ClientLogsService;
  let repo: jest.Mocked<ClientLogsRepository>;

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      findAll: jest.fn(),
      countAll: jest.fn(),
      getDistinctValues: jest.fn(),
      aggregateByLevel: jest.fn(),
      aggregateByComponent: jest.fn(),
      aggregateByAction: jest.fn(),
      aggregateByRoute: jest.fn(),
      getErrorCount: jest.fn(),
    } as unknown as jest.Mocked<ClientLogsRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientLogsService, { provide: ClientLogsRepository, useValue: repo }],
    }).compile();

    service = module.get<ClientLogsService>(ClientLogsService);
  });

  describe('create', () => {
    it('persists a log and returns its id', async () => {
      repo.create.mockResolvedValue({ _id: 'abc123' } as never);
      const result = await service.create({ level: 'info', message: 'hello' });
      expect(repo.create).toHaveBeenCalledWith({ level: 'info', message: 'hello' });
      expect(result).toEqual({ id: 'abc123' });
    });

    it('coerces ObjectId-like _id to a string', async () => {
      repo.create.mockResolvedValue({ _id: { toString: () => 'oid-7' } } as never);
      const result = await service.create({ level: 'error', message: 'crash' });
      expect(result.id).toBe('oid-7');
    });

    it('rethrows repository errors', async () => {
      repo.create.mockRejectedValue(new Error('mongo down'));
      await expect(service.create({ level: 'info', message: 'x' })).rejects.toThrow('mongo down');
    });
  });

  describe('search', () => {
    it('returns paginated data with total / page / limit / totalPages', async () => {
      repo.findAll.mockResolvedValue([{ _id: '1' }, { _id: '2' }] as never);
      repo.countAll.mockResolvedValue(42);
      const result = await service.search({ page: 2, limit: 10 });
      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({ total: 42, page: 2, limit: 10, totalPages: 5 });
    });

    it('defaults page to 1 and limit to 20 when filters omit them', async () => {
      repo.findAll.mockResolvedValue([] as never);
      repo.countAll.mockResolvedValue(0);
      const result = await service.search({});
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(0);
    });

    it('passes the SortOrder.ASC filter through to the repository', async () => {
      repo.findAll.mockResolvedValue([] as never);
      repo.countAll.mockResolvedValue(0);
      await service.search({ sortOrder: SortOrder.ASC });
      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: SortOrder.ASC }),
      );
    });

    it('rethrows repository errors', async () => {
      repo.findAll.mockRejectedValue(new Error('boom'));
      repo.countAll.mockResolvedValue(0);
      await expect(service.search({})).rejects.toThrow('boom');
    });
  });

  describe('getStats', () => {
    it('aggregates by level / component / action / route plus total and error count', async () => {
      repo.aggregateByLevel.mockResolvedValue([{ _id: 'error', count: 4 }]);
      repo.aggregateByComponent.mockResolvedValue([{ _id: 'login', count: 3 }]);
      repo.aggregateByAction.mockResolvedValue([{ _id: 'click', count: 2 }]);
      repo.aggregateByRoute.mockResolvedValue([{ _id: '/dashboard', count: 1 }]);
      repo.countAll.mockResolvedValue(50);
      repo.getErrorCount.mockResolvedValue(4);

      const result = await service.getStats();

      expect(result.total).toBe(50);
      expect(result.errorCount).toBe(4);
      expect(result.byLevel).toEqual([{ _id: 'error', count: 4 }]);
      expect(result.topComponents).toEqual([{ _id: 'login', count: 3 }]);
      expect(result.topActions).toEqual([{ _id: 'click', count: 2 }]);
      expect(result.topRoutes).toEqual([{ _id: '/dashboard', count: 1 }]);
    });

    it('rethrows repository errors', async () => {
      repo.aggregateByLevel.mockRejectedValue(new Error('agg fail'));
      await expect(service.getStats()).rejects.toThrow('agg fail');
    });
  });

  describe('getDistinctValues', () => {
    it('forwards field + filters to repository', async () => {
      repo.getDistinctValues.mockResolvedValue({ field: 'component', values: ['a', 'b'] });
      const result = await service.getDistinctValues('component', { userId: 'u1' });
      expect(repo.getDistinctValues).toHaveBeenCalledWith('component', { userId: 'u1' });
      expect(result).toEqual({ field: 'component', values: ['a', 'b'] });
    });

    it('rethrows repository errors', async () => {
      repo.getDistinctValues.mockRejectedValue(new Error('distinct down'));
      await expect(service.getDistinctValues('x', {})).rejects.toThrow('distinct down');
    });
  });
});
