import { Injectable, Logger } from '@nestjs/common';
import { CLOUD_ROUTER_MAX_CANDIDATES } from '../constants/cloud-router-eligibility.constants';
import { ModelDeploymentRepository } from '../repositories/model-deployment.repository';
import { ExposedModelsService } from '../services/exposed-models.service';
import {
  catalogMatchKey,
  modelMatchKey,
  selectCloudRouterCandidates,
} from '../utilities/cloud-router-candidates.utility';
import type { EligibleDeploymentRecord } from '../types/model-deployment.types';
import { UNAVAILABLE_PROVIDER } from '../constants/routing.constants';
import type { RoutingContext, RoutingDecisionResult } from '../types/routing.types';
import { rankDecisionByModalityFit } from '../utilities/modality-fit.utility';

/**
 * Hard eligibility filter for the cloud router's candidate set.
 *
 * Privacy class and activation state only — no scoring. CloudRouterManager's
 * chain walk already handles ordering and fallback across whatever this
 * returns, so ranking here would duplicate that logic under a different name.
 *
 * `handleAuto` already routes privacy/medical/legal/finance/executive/
 * government content away from the cloud router entirely before this ever
 * runs. This filter does not assume that upstream guard exists — it enforces
 * the same LOCAL_ONLY/LOCAL_PREFERRED exclusion independently, since it is a
 * unit worth trusting (and testing) on its own.
 */
@Injectable()
export class CloudRouterEligibilityManager {
  private readonly logger = new Logger(CloudRouterEligibilityManager.name);

  constructor(
    private readonly deployments: ModelDeploymentRepository,
    private readonly exposedModels: ExposedModelsService,
  ) {}

  /**
   * `max` defaults to the router prompt's list size; the picked-model
   * substitute ranking asks for a larger pool (same-provider models first).
   */
  async resolveEligibleDeployments(
    context: RoutingContext,
    max: number = CLOUD_ROUTER_MAX_CANDIDATES,
  ): Promise<EligibleDeploymentRecord[]> {
    const [routable, exposed] = await Promise.all([
      this.deployments.findRoutableForCloudRouting(),
      this.exposedModels.exposedChatModels(),
    ]);
    const allowed =
      context.modelAccessAllowAll === true || context.allowedModels === undefined
        ? null
        : new Set(
            context.allowedModels.map((entry) => {
              const slash = entry.indexOf('/');
              return modelMatchKey(entry.slice(0, slash), entry.slice(slash + 1));
            }),
          );
    const eligible = selectCloudRouterCandidates(routable, {
      exposed,
      allowed,
      connectorHealth: context.connectorHealth ?? {},
      max,
      requiredModalities: context.requiredModalities ?? [],
      transformableModalities: context.transformableModalities ?? [],
    });
    this.logger.debug(
      `resolveEligibleDeployments: thread=${context.threadId ?? 'none'} routable=${String(routable.length)} ` +
        `exposed=${exposed === null ? 'unavailable' : String(exposed.size)} ` +
        `planRestricted=${String(allowed !== null)} eligible=${String(eligible.length)} ` +
        `providers=${[...new Set(eligible.map((entry) => entry.provider))].join(',')} ` +
        `required=${(context.requiredModalities ?? []).join(',')} ` +
        `fit=${eligible.map((entry) => entry.modalityFit ?? '-').join(',')}`,
    );
    return eligible;
  }

  /**
   * Modality fit for the AUTO paths that do not go through the cloud router
   * (privacy-local, Ollama router, category model, heuristic - rule 51 item
   * 13). Same `modalityFitOf` tiers as `selectCloudRouterCandidates`, applied
   * to the decision the path already built: capable models move ahead of ones
   * that cannot read the attachments; nothing is removed. No attachments = no
   * database read and the decision is returned untouched.
   */
  async rankDecisionByModalityFit(
    decision: RoutingDecisionResult,
    context: RoutingContext,
  ): Promise<RoutingDecisionResult> {
    const required = context.requiredModalities ?? [];
    if (required.length === 0 || decision.selectedProvider === UNAVAILABLE_PROVIDER) {
      return decision;
    }
    const routable = await this.deployments.findRoutableForCloudRouting();
    const byKey = new Map(
      routable.map((row) => [modelMatchKey(row.provider, row.providerModelId), row]),
    );
    const ranking = rankDecisionByModalityFit(
      decision,
      (entry) => byKey.get(catalogMatchKey(entry)),
      required,
      context.transformableModalities ?? [],
    );
    const picked = `${decision.selectedProvider}/${decision.selectedModel}`;
    const outcome = ranking.reordered
      ? `${picked} is ${ranking.originalFit} -> ${ranking.decision.selectedProvider}/${ranking.decision.selectedModel} (${ranking.fit})`
      : `kept ${picked} (${ranking.fit})`;
    this.logger.log(
      `rankDecisionByModalityFit: thread=${context.threadId ?? 'none'} required=${required.join(',')} ${outcome}`,
    );
    return ranking.decision;
  }
}

