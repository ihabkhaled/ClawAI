import { Injectable, Logger } from '@nestjs/common';
import { CLOUD_ROUTER_MAX_CANDIDATES } from '../constants/cloud-router-eligibility.constants';
import { ModelDeploymentRepository } from '../repositories/model-deployment.repository';
import { ExposedModelsService } from '../services/exposed-models.service';
import {
  modelMatchKey,
  selectCloudRouterCandidates,
} from '../utilities/cloud-router-candidates.utility';
import type { EligibleDeploymentRecord } from '../types/model-deployment.types';
import type { RoutingContext } from '../types/routing.types';

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

  async resolveEligibleDeployments(context: RoutingContext): Promise<EligibleDeploymentRecord[]> {
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
      max: CLOUD_ROUTER_MAX_CANDIDATES,
    });
    this.logger.debug(
      `resolveEligibleDeployments: thread=${context.threadId ?? 'none'} routable=${String(routable.length)} ` +
        `exposed=${exposed === null ? 'unavailable' : String(exposed.size)} ` +
        `planRestricted=${String(allowed !== null)} eligible=${String(eligible.length)} ` +
        `providers=${[...new Set(eligible.map((entry) => entry.provider))].join(',')}`,
    );
    return eligible;
  }
}
