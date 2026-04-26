import { Test, type TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ClientLogsRepository } from '../client-logs.repository';
import { ClientLog } from '../../schemas/client-log.schema';
import { SortOrder } from '../../../../common/enums/sort-order.enum';

describe('ClientLogsRepository', () => {
  let repository: ClientLogsRepository;
  let modelMock: jest.Mocked<{
    find: jest.Mock;
    countDocuments: jest.Mock;
    distinct: jest.Mock;
    aggregate: jest.Mock;
    save: jest.Mock;
  }>;

  const buildQueryChain = () => ({
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
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(99) }),
      distinct: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(['a', 'b', 'c']) }),
      aggregate: jest.fn().mockResolvedValue([{ _id: 'info', count: 10 }]),
    });
    modelMock = modelFactory as never;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientLogsRepository,
        { provide: getModelToken(ClientLog.name), useValue: modelMock },
      ],
    }).compile();

    repository = module.get<ClientLogsRepository>(ClientLogsRepository);
  });

  describe('create', () => {
    it('saves and returns the document', async () => {
      const result = await repository.create({ level: 'info', message: 'hello' });
      expect(result).toEqual({ _id: 'saved' });
    });
  });

  describe('findAll', () => {
    it('queries with default page=1 limit=20 and DESC sort when sortOrder is omitted', async () => {
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
      await repository.findAll({ sortBy: 'level' });
      expect(queryChain.sort).toHaveBeenCalledWith({ level: -1 });
    });

    it('skips correctly for page=3 limit=10', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ page: 3, limit: 10 });
      expect(queryChain.skip).toHaveBeenCalledWith(20);
      expect(queryChain.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('countAll', () => {
    it('returns the count from the model', async () => {
      const result = await repository.countAll({});
      expect(result).toBe(99);
    });
  });

  describe('buildQuery (via findAll)', () => {
    it('applies all simple equality filters', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({
        component: 'login',
        action: 'click',
        route: '/x',
        userId: 'u1',
        sessionId: 's1',
        threadId: 't1',
        connectorId: 'c1',
        requestId: 'r1',
        errorCode: 'E1',
      });
      const calledQuery = modelMock.find.mock.calls[0]?.[0];
      expect(calledQuery).toMatchObject({
        component: 'login',
        action: 'click',
        route: '/x',
        userId: 'u1',
        sessionId: 's1',
        threadId: 't1',
        connectorId: 'c1',
        requestId: 'r1',
        errorCode: 'E1',
      });
    });

    it('applies case-insensitive level filter via $regex', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ level: 'WARN' });
      const calledQuery = modelMock.find.mock.calls[0]?.[0];
      expect(calledQuery.level).toEqual({ $regex: '^WARN$', $options: 'i' });
    });

    it('applies date range filters', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });
      const calledQuery = modelMock.find.mock.calls[0]?.[0];
      expect(calledQuery.createdAt.$gte).toBeInstanceOf(Date);
      expect(calledQuery.createdAt.$lte).toBeInstanceOf(Date);
    });

    it('applies $text search', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ search: 'oauth failure' });
      const calledQuery = modelMock.find.mock.calls[0]?.[0];
      expect(calledQuery.$text).toEqual({ $search: 'oauth failure' });
    });

    it('applies messageContains as case-insensitive regex', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ messageContains: 'failed' });
      const calledQuery = modelMock.find.mock.calls[0]?.[0];
      expect(calledQuery.message).toEqual({ $regex: 'failed', $options: 'i' });
    });
  });

  describe('getDistinctValues', () => {
    it('returns the field plus distinct values capped at 200', async () => {
      modelMock.distinct.mockReturnValue({
        exec: jest.fn().mockResolvedValue(Array.from({ length: 250 }, (_, i) => `v${String(i)}`)),
      });
      const result = await repository.getDistinctValues('component', {});
      expect(result.field).toBe('component');
      expect(result.values).toHaveLength(200);
    });
  });

  describe('aggregations', () => {
    it('aggregateByLevel returns model.aggregate result', async () => {
      const result = await repository.aggregateByLevel();
      expect(result).toEqual([{ _id: 'info', count: 10 }]);
    });

    it('aggregateByComponent filters out null components', async () => {
      await repository.aggregateByComponent();
      const pipeline = modelMock.aggregate.mock.calls[0]?.[0];
      expect(pipeline).toEqual(
        expect.arrayContaining([expect.objectContaining({ $match: { component: { $ne: null } } })]),
      );
    });

    it('aggregateByAction filters out null actions', async () => {
      await repository.aggregateByAction();
      const pipeline = modelMock.aggregate.mock.calls[0]?.[0];
      expect(pipeline).toEqual(
        expect.arrayContaining([expect.objectContaining({ $match: { action: { $ne: null } } })]),
      );
    });

    it('aggregateByRoute filters out null routes', async () => {
      await repository.aggregateByRoute();
      const pipeline = modelMock.aggregate.mock.calls[0]?.[0];
      expect(pipeline).toEqual(
        expect.arrayContaining([expect.objectContaining({ $match: { route: { $ne: null } } })]),
      );
    });
  });

  describe('getErrorCount', () => {
    it('forces level filter to "error" regardless of filter input', async () => {
      await repository.getErrorCount({ level: 'info' });
      const calledQuery = modelMock.countDocuments.mock.calls[0]?.[0];
      expect(calledQuery.level).toEqual({ $regex: '^error$', $options: 'i' });
    });
  });
});
