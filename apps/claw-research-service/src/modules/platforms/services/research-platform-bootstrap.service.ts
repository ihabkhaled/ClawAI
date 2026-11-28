import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { describeFetchFailure } from '../../../common/utilities/describe-fetch-failure.utility';
import { PLATFORM_SEED } from '../constants/platform-seed.constants';
import { ResearchPlatformRepository } from '../repositories/research-platform.repository';

/**
 * Idempotent seeder for the platform registry (research engine B3): every seed
 * slug that is missing is created; a slug that exists is never touched, so an
 * admin's edit (enabled, priority, domains, …) survives every boot and deploy.
 * A seed failure is logged and never blocks the service from starting.
 */
@Injectable()
export class ResearchPlatformBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(ResearchPlatformBootstrapService.name);

  constructor(private readonly platforms: ResearchPlatformRepository) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seed();
    } catch (error) {
      this.logger.warn(`research.platforms.seed_failed: ${describeFetchFailure(error)}`);
    }
  }

  /** Creates the missing seed rows; returns how many were created. */
  async seed(): Promise<number> {
    const existing = new Set(await this.platforms.listSlugs());
    const missing = PLATFORM_SEED.filter((seed) => !existing.has(seed.slug));
    if (missing.length === 0) {
      return 0;
    }
    const created = await this.platforms.createMissing(
      missing.map((seed) => ({
        slug: seed.slug,
        name: seed.name,
        category: seed.category,
        accessMethod: seed.accessMethod,
        apiKind: seed.apiKind,
        domains: seed.domains,
        languages: seed.languages,
        priority: seed.priority,
        notes: seed.notes,
      })),
    );
    this.logger.log(`research.platforms.seeded created=${String(created)}`);
    return created;
  }
}
