import { Injectable } from '@nestjs/common';

import { RouterModelRegistryRepository } from '../repositories/router-model-registry.repository';
import { type ModelVisibilitySnapshot } from '../types/model-visibility.types';
import { ModelCostService } from './model-cost.service';

/**
 * The routing-side picker gates for one model: registry row, router-only flag,
 * cost class. The class comes from `resolveCostClasses`, the same path the
 * picker's plan check uses, so the diagnostic cannot disagree with it.
 */
@Injectable()
export class ModelVisibilityService {
  constructor(
    private readonly registryRepo: RouterModelRegistryRepository,
    private readonly costs: ModelCostService,
  ) {}

  async get(provider: string, modelKey: string): Promise<ModelVisibilitySnapshot> {
    const [record, classes] = await Promise.all([
      this.registryRepo.findByProviderAndModelKey(provider, modelKey),
      this.costs.resolveCostClasses([{ provider, model: modelKey }]),
    ]);
    return {
      provider,
      modelKey,
      inRegistry: record !== null,
      lifecycle: record?.lifecycle ?? null,
      isRouterOnly: record?.isRouterOnly ?? null,
      costClass: classes[0]?.costClass ?? null,
    };
  }
}
