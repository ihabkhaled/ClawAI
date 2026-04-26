import { UsageService } from '@modules/audits/services/usage.service';
import { type UsageLedgerRepository } from '@modules/audits/repositories/usage-ledger.repository';

describe('UsageService', () => {
  let service: UsageService;
  let repository: jest.Mocked<UsageLedgerRepository>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
      countAll: jest.fn(),
      aggregateByProvider: jest.fn(),
      aggregateByModel: jest.fn(),
      aggregateCostSummary: jest.fn(),
      aggregateLatencySummary: jest.fn(),
    } as unknown as jest.Mocked<UsageLedgerRepository>;

    service = new UsageService(repository);
  });

  describe('createUsageEntry', () => {
    it('should delegate to repository', async () => {
      const input = {
        userId: 'user-1',
        resourceType: 'llm_tokens',
        action: 'message.completed',
        quantity: 500,
        unit: 'tokens',
      };
      repository.create.mockResolvedValue({ _id: 'usage-1', ...input } as never);

      const result = await service.createUsageEntry(input);
      expect(repository.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(expect.objectContaining({ _id: 'usage-1' }));
    });
  });

  describe('getUsageEntries', () => {
    it('should return paginated results', async () => {
      repository.findAll.mockResolvedValue([{ _id: '1' }] as never);
      repository.countAll.mockResolvedValue(1);

      const result = await service.getUsageEntries({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('getUsageSummary', () => {
    it('should return summary with provider and model breakdowns', async () => {
      repository.aggregateByProvider.mockResolvedValue([
        { provider: 'openai', count: 10, totalTokens: 5000 },
      ]);
      repository.aggregateByModel.mockResolvedValue([
        { model: 'gpt-4', count: 10, totalTokens: 5000 },
      ]);
      repository.aggregateCostSummary.mockResolvedValue({
        totalTokens: 5000,
        totalRequests: 10,
        estimatedCost: 0.01,
      });

      const result = await service.getUsageSummary();

      expect(result.byProvider).toHaveLength(1);
      expect(result.byModel).toHaveLength(1);
      expect(result.totalRequests).toBe(10);
    });
  });

  describe('getCostSummary', () => {
    it('should return cost summary', async () => {
      repository.aggregateCostSummary.mockResolvedValue({
        totalTokens: 10000,
        totalRequests: 20,
        estimatedCost: 0.02,
      });

      const result = await service.getCostSummary();

      expect(result.totalTokens).toBe(10000);
      expect(result.totalRequests).toBe(20);
      expect(result.estimatedCost).toBe(0.02);
    });
  });

  describe('getLatencySummary', () => {
    it('should return latency summary', async () => {
      repository.aggregateLatencySummary.mockResolvedValue({
        avgLatency: 500,
        p50Latency: 400,
        p95Latency: 1200,
        totalRequests: 50,
      });

      const result = await service.getLatencySummary();

      expect(result.avgLatency).toBe(500);
      expect(result.p50Latency).toBe(400);
      expect(result.p95Latency).toBe(1200);
      expect(result.totalRequests).toBe(50);
    });
  });

  describe('error paths', () => {
    it('createUsageEntry rethrows repository errors', async () => {
      repository.create.mockRejectedValue(new Error('mongo down'));
      await expect(
        service.createUsageEntry({
          userId: 'u1',
          resourceType: 'tokens',
          action: 'consume',
          quantity: 100,
          unit: 'tokens',
        } as never),
      ).rejects.toThrow('mongo down');
    });

    it('getUsageEntries rethrows repository errors', async () => {
      repository.findAll.mockRejectedValue(new Error('query fail'));
      repository.countAll.mockResolvedValue(0);
      await expect(service.getUsageEntries({})).rejects.toThrow('query fail');
    });

    it('getUsageSummary rethrows aggregation errors', async () => {
      repository.aggregateByProvider.mockRejectedValue(new Error('agg fail'));
      await expect(service.getUsageSummary()).rejects.toThrow('agg fail');
    });

    it('getCostSummary rethrows aggregation errors', async () => {
      repository.aggregateCostSummary.mockRejectedValue(new Error('cost fail'));
      await expect(service.getCostSummary()).rejects.toThrow('cost fail');
    });

    it('getLatencySummary rethrows aggregation errors', async () => {
      repository.aggregateLatencySummary.mockRejectedValue(new Error('lat fail'));
      await expect(service.getLatencySummary()).rejects.toThrow('lat fail');
    });

    it('getUsageEntries uses defaults when page/limit are omitted', async () => {
      repository.findAll.mockResolvedValue([] as never);
      repository.countAll.mockResolvedValue(0);
      const result = await service.getUsageEntries({});
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });
  });
});
