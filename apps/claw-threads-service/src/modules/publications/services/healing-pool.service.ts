import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENTITLEMENTS_ADAPTER, type EntitlementsAdapter } from '@claw/shared-entitlements';
import type { ThreadHealingPool } from '@claw/shared-types';

import { buildHealingPool } from '../utilities/healing-pool.utility';
import { ModelCatalogClient } from './model-catalog.client';
import { ModelCostClassClient } from './model-cost-class.client';

/**
 * Picks the models a Thread job may heal with after its seats' own backups (ADR-181), from the
 * same plan test and picker catalog the start preflight uses. Healing is an extra: when the plan
 * or the catalog cannot be read the answer is "no pool" and the start goes ahead exactly as
 * before. It never calls a model.
 */
@Injectable()
export class HealingPoolService {
  private readonly logger = new Logger(HealingPoolService.name);

  constructor(
    @Inject(ENTITLEMENTS_ADAPTER) private readonly entitlements: EntitlementsAdapter,
    private readonly catalog: ModelCatalogClient,
    private readonly costClasses: ModelCostClassClient,
  ) {}

  async forOwner(ownerId: string): Promise<ThreadHealingPool | undefined> {
    try {
      const [entitlements, models] = await Promise.all([
        this.entitlements.getEntitlements(ownerId, { enforceTrial: false }),
        this.catalog.listModels(),
      ]);
      const classes = await this.costClasses.forPlan(entitlements, models);
      return buildHealingPool(entitlements, models, classes);
    } catch {
      this.logger.warn('Healing pool could not be built; the job runs with its own backups only');
      return undefined;
    }
  }
}
