import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { hashRequestPayload } from '@claw/shared-utilities';
import { SeedApplyOutcome } from '../../../common/enums';
import {
  MODEL_COST_SEED_ENTRIES,
  MODEL_COST_SEED_NAME,
  MODEL_COST_SEED_VERSION,
} from '../constants/model-cost-seed.constants';
import { ModelCostSeedRepository } from '../repositories/model-cost-seed.repository';
import { type ModelCostSeedResult } from '../types/model-cost-seed.types';

/**
 * Puts a price in the model-cost table on first boot.
 *
 * WHY THIS IS LAUNCH-BLOCKING. `ModelCostVersion` shipped with a schema, a
 * service, a controller and a spec but no seeder, so on a fresh install the
 * price table was empty. PAYG treats an unpriced model on a metered provider as
 * BLOCKED, never free — an unpriced model is an unbounded liability, not a
 * giveaway — so an empty table refuses every paid request on day one. This is
 * the bootstrap that stops that.
 *
 * WHAT IT DELIBERATELY DOES NOT DO.
 *  - It does not reconcile. A model that already carries a price is left alone,
 *    including one an administrator pinned. Re-running can never overwrite
 *    someone else's number.
 *  - It does not publish `routing.model_cost.published`. That event exists to
 *    bust auth-service's rate cache after a REPRICING; at first boot there is
 *    nothing cached to bust, and firing sixteen events into an exchange whose
 *    consumer may not have asserted its queue yet would be noise at best.
 *    Repricing goes through `ModelCostService.publish`, which does emit it.
 */
@Injectable()
export class ModelCostSeedService implements OnModuleInit {
  private readonly logger = new Logger(ModelCostSeedService.name);

  constructor(private readonly repository: ModelCostSeedRepository) {}

  async onModuleInit(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<ModelCostSeedResult> {
    if (MODEL_COST_SEED_ENTRIES.length === 0) {
      this.logger.warn('seed: no seed entries defined - the price table stays empty');
      return { outcome: SeedApplyOutcome.NOTHING_TO_SEED, inserted: 0, skipped: 0 };
    }

    const result = await this.repository.applyOnce({
      name: MODEL_COST_SEED_NAME,
      version: MODEL_COST_SEED_VERSION,
      // The checksum covers the RATES, not just the model list. A price
      // correction that kept the same sixteen models must still register as a
      // changed payload, or bumping the version would look like a no-op.
      checksum: hashRequestPayload(MODEL_COST_SEED_ENTRIES),
      entries: MODEL_COST_SEED_ENTRIES,
    });

    this.logOutcome(result);
    return result;
  }

  private logOutcome(result: ModelCostSeedResult): void {
    const summary = `defined=${String(MODEL_COST_SEED_ENTRIES.length)} inserted=${String(result.inserted)} skipped=${String(result.skipped)}`;

    if (result.outcome === SeedApplyOutcome.CHECKSUM_MISMATCH) {
      // The price list has been edited since this version was applied. NOT an
      // error and nothing was written — but it does mean the running prices are
      // the older ones, so it is surfaced rather than swallowed. Bump
      // MODEL_COST_SEED_VERSION to apply the new list deliberately.
      this.logger.warn(
        `seed: ${MODEL_COST_SEED_NAME} v${String(MODEL_COST_SEED_VERSION)} was applied with a different price list; ` +
          `the stored prices are unchanged. Bump the seed version to apply the edit. ${summary}`,
      );
      return;
    }

    this.logger.log(`seed: outcome=${result.outcome} ${summary}`);
  }
}
