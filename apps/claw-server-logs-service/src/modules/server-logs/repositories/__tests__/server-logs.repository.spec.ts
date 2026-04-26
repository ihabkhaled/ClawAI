import { Test, type TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ServerLogsRepository } from '../server-logs.repository';
import { ServerLog } from '../../schemas/server-log.schema';
import { SortOrder } from '../../../../common/enums/sort-order.enum';

describe('ServerLogsRepository', () => {
  let repository: ServerLogsRepository;
  let modelMock: jest.Mocked<{
    find: jest.Mock;
    countDocuments: jest.Mock;
    distinct: jest.Mock;
    aggregate: jest.Mock;
    insertMany: jest.Mock;
  }>;

  const buildQueryChain = (): {
    sort: jest.Mock;
    skip: jest.Mock;
    limit: jest.Mock;
    exec: jest.Mock;
  } => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([{ _id: '1' }]),
  });

  beforeEach(async () => {
    const queryChain = buildQueryChain();
    const docMock = { save: jest.fn().mockResolvedValue({ _id: 'saved' }) };
    function modelFactory(): typeof docMock {
      return docMock;
    }
    Object.assign(modelFactory, {
      find: jest.fn().mockReturnValue(queryChain),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(42) }),
      distinct: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(['a', 'b']) }),
      aggregate: jest.fn().mockResolvedValue([{ _id: 'info', count: 10 }]),
      insertMany: jest.fn().mockResolvedValue([{}, {}, {}]),
    });
    modelMock = modelFactory as never;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerLogsRepository,
        { provide: getModelToken(ServerLog.name), useValue: modelMock },
      ],
    }).compile();

    repository = module.get<ServerLogsRepository>(ServerLogsRepository);
  });

  describe('create / createMany', () => {
    it('saves single log via mongoose model', async () => {
      const result = await repository.create({
        level: 'info',
        message: 'x',
        serviceName: 's1',
      });
      expect(result).toEqual({ _id: 'saved' });
    });

    it('createMany returns insertMany result length', async () => {
      const result = await repository.createMany([
        { level: 'info', message: 'a', serviceName: 's1' },
      ]);
      expect(result).toBe(3);
      expect(modelMock.insertMany).toHaveBeenCalledWith(
        [{ level: 'info', message: 'a', serviceName: 's1' }],
        { ordered: false },
      );
    });
  });

  describe('findAll', () => {
    it('uses default page=1 limit=20 and DESC sort when sortOrder is omitted', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({});
      expect(queryChain.skip).toHaveBeenCalledWith(0);
      expect(queryChain.limit).toHaveBeenCalledWith(20);
      expect(queryChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('uses ASC sort when sortOrder is SortOrder.ASC', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ sortOrder: SortOrder.ASC });
      expect(queryChain.sort).toHaveBeenCalledWith({ createdAt: 1 });
    });

    it('respects custom sortBy', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ sortBy: 'latencyMs' });
      expect(queryChain.sort).toHaveBeenCalledWith({ latencyMs: -1 });
    });
  });

  describe('countAll', () => {
    it('returns model count', async () => {
      const result = await repository.countAll({});
      expect(result).toBe(42);
    });
  });

  describe('buildQuery (via findAll)', () => {
    it('applies simple equality filters', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({
        serviceName: 'auth',
        module: 'login',
        controller: 'AuthController',
        service: 'AuthService',
        manager: 'AuthManager',
        action: 'login',
        method: 'POST',
        statusCode: 200,
        requestId: 'req-1',
        traceId: 'tr-1',
        userId: 'u1',
        threadId: 't1',
        messageId: 'm1',
        connectorId: 'c1',
        provider: 'openai',
        modelName: 'gpt-4',
        errorCode: 'E1',
      });
      const calledQuery = modelMock.find.mock.calls[0]?.[0];
      expect(calledQuery).toMatchObject({
        serviceName: 'auth',
        module: 'login',
        statusCode: 200,
        method: 'POST',
        provider: 'openai',
      });
    });

    it('applies case-insensitive level filter via $regex', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ level: 'WARN' });
      const q = modelMock.find.mock.calls[0]?.[0];
      expect(q.level).toEqual({ $regex: '^WARN$', $options: 'i' });
    });

    it('applies route as case-insensitive substring regex', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ route: '/api/auth' });
      const q = modelMock.find.mock.calls[0]?.[0];
      expect(q.route).toEqual({ $regex: '/api/auth', $options: 'i' });
    });

    it('applies statusCode range filters with $gte/$lte', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ statusCodeMin: 400, statusCodeMax: 499 });
      const q = modelMock.find.mock.calls[0]?.[0];
      expect(q.statusCode.$gte).toBe(400);
      expect(q.statusCode.$lte).toBe(499);
    });

    it('applies latency range filters with $gte/$lte', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ latencyMin: 100, latencyMax: 500 });
      const q = modelMock.find.mock.calls[0]?.[0];
      expect(q.latencyMs.$gte).toBe(100);
      expect(q.latencyMs.$lte).toBe(500);
    });

    it('applies date range filters', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ startDate: '2026-01-01', endDate: '2026-12-31' });
      const q = modelMock.find.mock.calls[0]?.[0];
      expect(q.createdAt.$gte).toBeInstanceOf(Date);
      expect(q.createdAt.$lte).toBeInstanceOf(Date);
    });

    it('applies $text search and message regex', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ search: 'oauth', messageContains: 'failed' });
      const q = modelMock.find.mock.calls[0]?.[0];
      expect(q.$text).toEqual({ $search: 'oauth' });
      expect(q.message).toEqual({ $regex: 'failed', $options: 'i' });
    });
  });

  describe('aggregations', () => {
    it.each([
      ['aggregateByLevel'],
      ['aggregateByService'],
      ['aggregateByAction'],
      ['aggregateByMethod'],
      ['aggregateByStatusCode'],
      ['aggregateByModule'],
    ])('%s returns model.aggregate result', async (method) => {
      const result = await (repository as never as Record<string, () => Promise<unknown>>)[
        method
      ]?.();
      expect(result).toEqual([{ _id: 'info', count: 10 }]);
    });
  });

  describe('getDistinctValues', () => {
    it('caps results at 200', async () => {
      modelMock.distinct.mockReturnValue({
        exec: jest.fn().mockResolvedValue(Array.from({ length: 250 }, (_, i) => `v${String(i)}`)),
      });
      const result = await repository.getDistinctValues('serviceName', {});
      expect(result.values).toHaveLength(200);
      expect(result.field).toBe('serviceName');
    });
  });

  describe('getErrorCount', () => {
    it('forces level filter to "error"', async () => {
      await repository.getErrorCount({ level: 'info' });
      const q = modelMock.countDocuments.mock.calls[0]?.[0];
      expect(q.level).toBe('error');
    });
  });

  describe('getAvgLatency', () => {
    it('returns rounded average from aggregate', async () => {
      modelMock.aggregate.mockResolvedValue([{ avgLatency: 42.6 }]);
      const result = await repository.getAvgLatency({});
      expect(result).toBe(43);
    });

    it('returns 0 when no data', async () => {
      modelMock.aggregate.mockResolvedValue([]);
      const result = await repository.getAvgLatency({});
      expect(result).toBe(0);
    });
  });

  describe('getTimeSeries', () => {
    it('runs aggregate with the configured intervalMs', async () => {
      modelMock.aggregate.mockResolvedValue([{ timestamp: '2026-01-01T00:00:00Z', count: 5 }]);
      const result = await repository.getTimeSeries({}, 5);
      expect(modelMock.aggregate).toHaveBeenCalled();
      expect(result).toEqual([{ timestamp: '2026-01-01T00:00:00Z', count: 5 }]);
    });
  });
});
