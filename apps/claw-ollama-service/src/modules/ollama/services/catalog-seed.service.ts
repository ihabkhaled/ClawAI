import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CATALOG_ENTRIES } from '../constants/catalog-entries.constants';
import { ModelCatalogRepository } from '../repositories/model-catalog.repository';

@Injectable()
export class CatalogSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatalogSeedService.name);

  constructor(private readonly catalogRepository: ModelCatalogRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.seedCatalog();
    } catch (error: unknown) {
      this.logger.warn(`Catalog auto-seed failed (non-fatal): ${String(error)}`);
    }
  }

  private async seedCatalog(): Promise<void> {
    const entries = [...CATALOG_ENTRIES];
    this.logger.log(`Seeding ${String(entries.length)} model catalog entries...`);

    for (const entry of entries) {
      await this.catalogRepository.upsertEntry(entry);
    }

    this.logger.log(`Model catalog seed complete (${String(entries.length)} entries upserted)`);
  }
}
