import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { hashRequestPayload } from '@claw/shared-utilities';
import { SeedApplyOutcome } from '../../../common/enums';
import {
  MODEL_PARAMETER_SEED_NAME,
  MODEL_PARAMETER_SEED_VERSION,
  PARAMETER_NAMING_FAMILIES,
  PUBLISHED_PARAMETER_COUNT_RULES,
} from '../constants/model-parameter-count.constants';
import { ModelParameterSeedRepository } from '../repositories/model-parameter-seed.repository';
import { type ModelParameterSeedResult } from '../types/model-parameter-count.types';

/**
 * Puts a parameter count on the registry rows that have none, at boot (ADR-234).
 *
 * The picker shows "1M context, 671B params" beside each model. The count is the
 * one number a connector never reports for a cloud model, so a maker-published
 * table (`PUBLISHED_PARAMETER_COUNT_RULES`, each rule naming its source page)
 * supplies it for open-weight models, and a closed model stays NULL.
 *
 * It never overwrites: see `ModelParameterSeedRepository.applyOnce`. Rows the
 * sync creates AFTER this seed ran are filled by the sync itself from the same
 * rules, so a new model does not have to wait for a version bump.
 */
@Injectable()
export class ModelParameterSeedService implements OnModuleInit {
  private readonly logger = new Logger(ModelParameterSeedService.name);

  constructor(private readonly repository: ModelParameterSeedRepository) {}

  async onModuleInit(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<ModelParameterSeedResult> {
    const result = await this.repository.applyOnce({
      name: MODEL_PARAMETER_SEED_NAME,
      version: MODEL_PARAMETER_SEED_VERSION,
      checksum: hashRequestPayload(ModelParameterSeedService.fingerprint()),
    });

    if (result.outcome === SeedApplyOutcome.CHECKSUM_MISMATCH) {
      this.logger.warn(
        `seed: ${MODEL_PARAMETER_SEED_NAME} v${String(MODEL_PARAMETER_SEED_VERSION)} was applied with a different rule table; ` +
          'stored counts are unchanged. Bump MODEL_PARAMETER_SEED_VERSION to apply the edit.',
      );
      return result;
    }
    this.logger.log(
      `seed: outcome=${result.outcome} filled=${String(result.filled)} skipped=${String(result.skipped)}`,
    );
    return result;
  }

  /** A RegExp serialises to `{}`, so the checksum covers each pattern's source text and its count. */
  private static fingerprint(): unknown {
    return {
      families: PARAMETER_NAMING_FAMILIES.source,
      rules: PUBLISHED_PARAMETER_COUNT_RULES.map((rule) => ({
        keys: rule.keys,
        total: rule.totalBillions,
        active: rule.activeBillions ?? null,
      })),
    };
  }
}
