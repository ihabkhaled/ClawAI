import { Injectable, Logger } from '@nestjs/common';
import { ModelDeploymentRepository } from '../repositories/model-deployment.repository';
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

  constructor(private readonly deployments: ModelDeploymentRepository) {}

  async resolveEligibleDeployments(context: RoutingContext): Promise<EligibleDeploymentRecord[]> {
    const eligible = await this.deployments.findEligibleForCloudRouting();
    this.logger.debug(
      `resolveEligibleDeployments: thread=${context.threadId ?? 'none'} found ${String(eligible.length)} eligible deployment(s)`,
    );
    return eligible;
  }
}
