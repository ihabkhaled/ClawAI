import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { hashRequestPayload } from '@claw/shared-utilities';
import { SeedApplyOutcome } from '../../../common/enums';
import {
  ROUTER_CHAIN_SEED_CONFIGURATION,
  ROUTER_CHAIN_SEED_ENTRIES,
  ROUTER_CHAIN_SEED_NAME,
  ROUTER_CHAIN_SEED_VERSION,
} from '../constants/router-chain-seed.constants';
import { RouterChainSeedRepository } from '../repositories/router-chain-seed.repository';

/**
 * Seeds the default cloud-first chain once, on boot.
 *
 * The result is a PUBLISHED revision 1 that is `enabled: false` and whose
 * entries carry aliases rather than resolved endpoints. Nothing routes through
 * it until discovery resolves the aliases and an admin turns it on — which is
 * the point: a seed proposes a chain, it does not put production on it.
 */
@Injectable()
export class RouterChainSeedService implements OnModuleInit {
  private readonly logger = new Logger(RouterChainSeedService.name);

  constructor(private readonly repository: RouterChainSeedRepository) {}

  async onModuleInit(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<SeedApplyOutcome> {
    const outcome = await this.repository.applyOnce({
      name: ROUTER_CHAIN_SEED_NAME,
      version: ROUTER_CHAIN_SEED_VERSION,
      checksum: hashRequestPayload({
        configuration: ROUTER_CHAIN_SEED_CONFIGURATION,
        entries: ROUTER_CHAIN_SEED_ENTRIES,
      }),
      configuration: ROUTER_CHAIN_SEED_CONFIGURATION,
      entries: ROUTER_CHAIN_SEED_ENTRIES,
    });

    if (outcome === SeedApplyOutcome.CHECKSUM_MISMATCH) {
      // The seeded definition changed after it was applied. Overwriting would
      // destroy admin edits, so the divergence is reported and left alone —
      // a new version is the supported way to change a shipped chain.
      this.logger.warn(
        `seed: ${ROUTER_CHAIN_SEED_NAME} v${String(ROUTER_CHAIN_SEED_VERSION)} was applied with a different definition; ` +
          'not overwriting. Ship a new seed version to change the default chain.',
      );
      return outcome;
    }

    this.logger.log(`seed: outcome=${outcome}`);
    return outcome;
  }
}
