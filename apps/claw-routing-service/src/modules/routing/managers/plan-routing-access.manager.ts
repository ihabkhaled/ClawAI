import { Injectable, Optional } from '@nestjs/common';
import { modelMatchKey } from '@claw/shared-utilities';

import { ModelCostService } from '../../router-models/services/model-cost.service';
import type { RoutingContext } from '../types/routing.types';
import { planEntryMatchKey } from '../utilities/plan-model-gate.utility';

/**
 * Which models a user's plan lets routing OFFER, as `modelMatchKey` keys, or
 * `null` when the plan restricts nothing.
 *
 * A cost-class plan (Free, Starter: `ALLOW_COST_CLASSES`) carries no explicit
 * model list; chat-service sends the deny-all key in `allowedModels` and the
 * classes in `allowedCostClasses`. Reading only the list therefore offered
 * such a user NOTHING: no picked-model substitute and no cloud-router candidate
 * (2026-11-23, `eligible=0` for every Free user). A class is resolved through
 * `ModelCostService.resolveCostClasses`, the same lookup the send gate uses, so
 * an unpriced model is not offered, exactly as it would be refused on send.
 */
@Injectable()
export class PlanRoutingAccessManager {
  constructor(@Optional() private readonly modelCosts?: ModelCostService) {}

  async allowedKeys(
    context: RoutingContext,
    candidates: ReadonlyArray<{ provider: string; model: string }>,
  ): Promise<ReadonlySet<string> | null> {
    if (context.modelAccessAllowAll === true || context.allowedModels === undefined) {
      return null;
    }
    const classes = context.allowedCostClasses;
    if (classes === undefined || this.modelCosts === undefined) {
      return new Set(context.allowedModels.map(planEntryMatchKey));
    }
    const wanted = new Set(classes);
    const resolved =
      wanted.size === 0 ? [] : await this.modelCosts.resolveCostClasses([...candidates]);
    return new Set(
      resolved
        .filter((entry) => entry.costClass !== null && wanted.has(entry.costClass))
        .map((entry) => modelMatchKey(entry.provider, entry.model)),
    );
  }
}
