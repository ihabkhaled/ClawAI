import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';

import {
  FALLBACK_BACKFILL_WINDOW_DAYS,
  FALLBACK_CADENCE_SECONDS,
  SYNC_CADENCE_SEED_DEFAULT_PRIORITY,
} from '../constants/sync-cadence.constants';
import { PROVIDER_DEFINITION_SEEDS } from '../constants/provider-registry.constants';
import { SyncCadenceRepository } from '../repositories/sync-cadence.repository';
import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

@Injectable()
export class SyncCadenceSeederManager implements OnApplicationBootstrap {
  private readonly logger = new Logger(SyncCadenceSeederManager.name);

  constructor(private readonly repo: SyncCadenceRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    let upserts = 0;
    for (const seed of PROVIDER_DEFINITION_SEEDS) {
      const provider = seed.provider as WorkspaceProvider;
      await this.repo.upsertDefault({
        provider,
        intervalSeconds: FALLBACK_CADENCE_SECONDS[provider],
        backfillWindowDays: FALLBACK_BACKFILL_WINDOW_DAYS,
        priority: SYNC_CADENCE_SEED_DEFAULT_PRIORITY,
        // Derived from the same drift-tested capability source
        // provider-registry-drift.spec.ts already verifies against every
        // adapter — not a fourth, independently-maintained flag.
        supportsDeltaSync: seed.capabilities['deltaSync'] === true,
        supportsWebhookSync: seed.capabilities['webhooks'] === true,
        nativeCursorKind: null,
      });
      upserts += 1;
    }
    this.logger.log(`seeded workspace sync-cadence defaults: ${String(upserts)}`);
  }
}
