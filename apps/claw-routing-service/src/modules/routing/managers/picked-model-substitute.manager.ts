import { Injectable, Logger } from '@nestjs/common';
import type { ModelCostClass } from '@claw/shared-types';
import { modelMatchKey, resolveVideoCapabilityProvider } from '@claw/shared-utilities';

import { RoutingMode } from '../../../generated/prisma';
import { ModelCostService } from '../../router-models/services/model-cost.service';
import {
  PICKED_MODEL_SUBSTITUTE_LIMIT,
  PICKED_MODEL_SUBSTITUTE_POOL,
} from '../constants/picked-model-substitute.constants';
import { FILE_GENERATION_PROVIDER, UNAVAILABLE_PROVIDER } from '../constants/routing.constants';
import type { PickedModelSubstitute } from '../types/picked-model-substitute.types';
import type { RoutingContext, RoutingDecisionResult } from '../types/routing.types';
import { rankPickedModelSubstitutes } from '../utilities/picked-model-substitute.utility';
import { CloudRouterEligibilityManager } from './cloud-router-eligibility.manager';

/**
 * Smart fallback for a model the user PICKED (MANUAL_MODEL).
 *
 * Before this a picked model that failed ended the turn with "All providers
 * failed": chat-service tried exactly one candidate. This names the models
 * that may stand in for it - drawn from the same eligible set AUTO uses
 * (exposed, healthy connector, allowed by the plan, never an image-output
 * model; rule 51 item 1) and ordered by `rankPickedModelSubstitutes`.
 *
 * Never throws: a lookup failure means "no substitutes", which is exactly the
 * old behaviour, never a failed routing decision.
 */
@Injectable()
export class PickedModelSubstituteManager {
  private readonly logger = new Logger(PickedModelSubstituteManager.name);

  constructor(
    private readonly eligibility: CloudRouterEligibilityManager,
    private readonly modelCosts: ModelCostService,
  ) {}

  async resolve(
    decision: RoutingDecisionResult,
    context: RoutingContext,
  ): Promise<PickedModelSubstitute[]> {
    if (!this.isChatPick(decision)) {
      return [];
    }
    try {
      const [eligible, costs] = await Promise.all([
        this.eligibility.resolveEligibleDeployments(context, PICKED_MODEL_SUBSTITUTE_POOL),
        this.modelCosts.listActive(),
      ]);
      const costClassByKey = new Map<string, ModelCostClass>(
        costs.map((row) => [modelMatchKey(row.provider, row.model), row.costClass]),
      );
      const substitutes = rankPickedModelSubstitutes({
        pick: { provider: decision.selectedProvider, model: decision.selectedModel },
        eligible,
        costClassOf: (provider, model) => costClassByKey.get(modelMatchKey(provider, model)),
        limit: PICKED_MODEL_SUBSTITUTE_LIMIT,
      });
      this.logger.log(
        `resolve: pick=${decision.selectedProvider}/${decision.selectedModel} eligible=${String(eligible.length)} ` +
          `substitutes=${substitutes.map((entry) => `${entry.provider}/${entry.model}${entry.costlier ? '(costlier)' : ''}`).join(',')}`,
      );
      return substitutes;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`resolve: substitutes unavailable - ${message}`);
      return [];
    }
  }

  /** A picked CHAT model: not an image/video/file generation pick, not "unavailable". */
  private isChatPick(decision: RoutingDecisionResult): boolean {
    const provider = decision.selectedProvider;
    return (
      decision.routingMode === RoutingMode.MANUAL_MODEL &&
      provider !== UNAVAILABLE_PROVIDER &&
      provider !== FILE_GENERATION_PROVIDER &&
      !provider.startsWith('IMAGE_') &&
      !provider.startsWith('VIDEO_') &&
      resolveVideoCapabilityProvider(provider, decision.selectedModel) === undefined
    );
  }
}
