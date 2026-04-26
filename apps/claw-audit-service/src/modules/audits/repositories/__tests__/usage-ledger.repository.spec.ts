import { Test, type TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsageLedgerRepository } from '../usage-ledger.repository';
import { UsageLedger } from '../../schemas/usage-ledger.schema';

describe('UsageLedgerRepository', () => {
  let repository: UsageLedgerRepository;
  let modelMock: jest.Mocked<{
    find: jest.Mock;
    countDocuments: jest.Mock;
    aggregate: jest.Mock;
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
    exec: jest.fn().mockResolvedValue([{ _id: 'u1' }]),
  });

  beforeEach(async () => {
    const queryChain = buildQueryChain();
    const docMock = { save: jest.fn().mockResolvedValue({ _id: 'usage-1' }) };
    function modelFactory(): typeof docMock {
      return docMock;
    }
    Object.assign(modelFactory, {
      find: jest.fn().mockReturnValue(queryChain),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(11) }),
      aggregate: jest
        .fn()
        .mockResolvedValue([{ provider: 'openai', count: 100, totalTokens: 5000 }]),
    });
    modelMock = modelFactory as never;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageLedgerRepository,
        { provide: getModelToken(UsageLedger.name), useValue: modelMock },
      ],
    }).compile();

    repository = module.get<UsageLedgerRepository>(UsageLedgerRepository);
  });

  it('create persists via mongoose', async () => {
    const result = await repository.create({
      resourceType: 'tokens',
      action: 'consume',
      quantity: 100,
      unit: 'token',
    } as never);
    expect(result).toEqual({ _id: 'usage-1' });
  });

  describe('findAll / buildUsageQuery', () => {
    it('uses default page=1 limit=20', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({});
      expect(queryChain.skip).toHaveBeenCalledWith(0);
      expect(queryChain.limit).toHaveBeenCalledWith(20);
    });

    it('applies userId / resourceType / action filters', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ userId: 'u1', resourceType: 'tokens', action: 'consume' });
      const q = modelMock.find.mock.calls[0]?.[0];
      expect(q.userId).toBe('u1');
      expect(q.resourceType).toBe('tokens');
      expect(q.action).toBe('consume');
    });

    it('maps provider/model to metadata.* paths', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ provider: 'openai', model: 'gpt-4' });
      const q = modelMock.find.mock.calls[0]?.[0];
      expect(q['metadata.provider']).toBe('openai');
      expect(q['metadata.model']).toBe('gpt-4');
    });

    it('applies date range filters', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ startDate: '2026-01-01', endDate: '2026-12-31' });
      const q = modelMock.find.mock.calls[0]?.[0];
      expect(q.createdAt.$gte).toBeInstanceOf(Date);
      expect(q.createdAt.$lte).toBeInstanceOf(Date);
    });
  });

  describe('countAll', () => {
    it('returns count from mongoose', async () => {
      const result = await repository.countAll({});
      expect(result).toBe(11);
    });
  });

  describe('aggregateByProvider / aggregateByModel', () => {
    it('aggregateByProvider returns aggregate result', async () => {
      const result = await repository.aggregateByProvider();
      expect(result).toEqual([{ provider: 'openai', count: 100, totalTokens: 5000 }]);
    });

    it('aggregateByModel returns aggregate result', async () => {
      const result = await repository.aggregateByModel();
      expect(result).toEqual([{ provider: 'openai', count: 100, totalTokens: 5000 }]);
    });
  });

  describe('aggregateCostSummary', () => {
    it('returns aggregated cost when data exists', async () => {
      modelMock.aggregate.mockResolvedValue([
        { totalTokens: 5000, totalRequests: 10, estimatedCost: 0.01 },
      ]);
      const result = await repository.aggregateCostSummary();
      expect(result.totalRequests).toBe(10);
      expect(result.estimatedCost).toBe(0.01);
    });

    it('returns zeroed summary when no data', async () => {
      modelMock.aggregate.mockResolvedValue([]);
      const result = await repository.aggregateCostSummary();
      expect(result).toEqual({ totalTokens: 0, totalRequests: 0, estimatedCost: 0 });
    });
  });

  describe('aggregateLatencySummary', () => {
    it('returns aggregated latency when data exists', async () => {
      modelMock.aggregate.mockResolvedValue([
        { avgLatency: 150.5, p50Latency: 100, p95Latency: 500, totalRequests: 25 },
      ]);
      const result = await repository.aggregateLatencySummary();
      expect(result.avgLatency).toBe(150.5);
      expect(result.totalRequests).toBe(25);
    });

    it('returns zeroed summary when no latency data', async () => {
      modelMock.aggregate.mockResolvedValue([]);
      const result = await repository.aggregateLatencySummary();
      expect(result).toEqual({
        avgLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        totalRequests: 0,
      });
    });
  });
});
