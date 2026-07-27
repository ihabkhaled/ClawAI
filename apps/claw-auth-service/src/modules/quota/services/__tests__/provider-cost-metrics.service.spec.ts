import { ProviderCostMetricsService } from '../provider-cost-metrics.service';
import type { WeightedUsageRepository } from '../../repositories/weighted-usage.repository';

describe('ProviderCostMetricsService', () => {
  it('serializes bigint provider costs at the service boundary', async () => {
    const usage = {
      aggregateProviderCosts: jest
        .fn()
        .mockResolvedValue([{ planId: 'plan-pro', costMicroUsd: 1_234_567n }]),
    };
    const service = new ProviderCostMetricsService(usage as unknown as WeightedUsageRepository);

    await expect(service.aggregate(new Date('2026-07-01T00:00:00.000Z'))).resolves.toEqual([
      { planId: 'plan-pro', costMicroUsd: '1234567' },
    ]);
  });
});
