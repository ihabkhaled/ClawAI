import { Injectable } from '@nestjs/common';

import { WeightedUsageRepository } from '../repositories/weighted-usage.repository';
import { type ProviderCostAggregateView } from '../types/provider-cost.types';

@Injectable()
export class ProviderCostMetricsService {
  constructor(private readonly usage: WeightedUsageRepository) {}

  async aggregate(from: Date): Promise<ProviderCostAggregateView[]> {
    const rows = await this.usage.aggregateProviderCosts(from);
    return rows.map((row) => ({
      planId: row.planId,
      costMicroUsd: row.costMicroUsd.toString(),
    }));
  }
}
