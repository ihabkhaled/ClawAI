import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { hashRequestPayload } from '@claw/shared-utilities';
import {
  DEPLOYMENT_SEED_NAME,
  DEPLOYMENT_SEED_VERSION,
} from '../constants/deployment-seed.constants';
import { SeedApplyOutcome } from '../../../common/enums';
import { DeploymentSeedRepository } from '../repositories/deployment-seed.repository';
import { deriveDeployments } from '../utilities/deployment-derivation.utility';

/**
 * Gives every registry definition that predates the definition/deployment split
 * a deployment row, once.
 *
 * Scope is deliberately narrow: this backfills what is already in the registry
 * at the moment it first runs. Creating deployments for models that appear
 * later is discovery's job, not a seed's — a seed that silently re-derived on
 * every boot would fight admin edits and connector sync for ownership of the
 * same rows. Bumping DEPLOYMENT_SEED_VERSION re-runs it deliberately.
 *
 * Every derived row lands in the schema's REQUIRES_VALIDATION default, so the
 * backfill creates candidates, never routable endpoints.
 */
@Injectable()
export class DeploymentSeedService implements OnModuleInit {
  private readonly logger = new Logger(DeploymentSeedService.name);

  constructor(private readonly repository: DeploymentSeedRepository) {}

  async onModuleInit(): Promise<void> {
    await this.backfill();
  }

  async backfill(): Promise<SeedApplyOutcome> {
    const definitions = await this.repository.findDefinitionsForBackfill();
    if (definitions.length === 0) {
      this.logger.log('backfill: registry is empty - nothing to seed');
      return SeedApplyOutcome.NOTHING_TO_SEED;
    }

    const { deployments, skipped } = deriveDeployments(definitions);

    for (const entry of skipped) {
      this.logger.warn(
        `backfill: skipped definition ${entry.definitionId} provider=${entry.provider} reason=${entry.reason}`,
      );
    }

    if (deployments.length === 0) {
      this.logger.warn(
        `backfill: ${String(definitions.length)} definition(s) produced no derivable deployment`,
      );
      return SeedApplyOutcome.NOTHING_TO_SEED;
    }

    const outcome = await this.repository.applyOnce({
      name: DEPLOYMENT_SEED_NAME,
      version: DEPLOYMENT_SEED_VERSION,
      checksum: hashRequestPayload(deployments.map((entry) => entry.deploymentKey).sort()),
      deployments,
    });

    this.logReconciliation(outcome, definitions.length, deployments.length, skipped.length);
    return outcome;
  }

  private logReconciliation(
    outcome: SeedApplyOutcome,
    definitionCount: number,
    deploymentCount: number,
    skippedCount: number,
  ): void {
    const summary = `definitions=${String(definitionCount)} derived=${String(deploymentCount)} skipped=${String(skippedCount)}`;

    if (outcome === SeedApplyOutcome.CHECKSUM_MISMATCH) {
      // The registry has changed since the backfill ran. That is expected as
      // models are added, and it is NOT an error — but it does mean the newer
      // definitions have no deployment until discovery creates one, so it is
      // surfaced rather than swallowed. No write happens on this path.
      this.logger.warn(
        `backfill: registry changed since ${DEPLOYMENT_SEED_NAME} v${String(DEPLOYMENT_SEED_VERSION)} was applied; ` +
          `newer definitions await discovery. ${summary}`,
      );
      return;
    }

    this.logger.log(`backfill: outcome=${outcome} ${summary}`);
  }
}
