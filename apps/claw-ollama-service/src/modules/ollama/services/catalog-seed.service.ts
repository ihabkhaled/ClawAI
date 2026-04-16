import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CATALOG_ENTRIES } from '../constants/catalog-entries.constants';
import { isDeprecatedDefaultLocalModel } from '../constants/default-models.constants';
import { ModelCatalogRepository } from '../repositories/model-catalog.repository';
import { ensureCatalogEntryHasReference } from '../utilities/catalog-reference.utility';

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

    const removed = await this.catalogRepository.deleteDeprecatedDefaults();
    if (removed > 0) {
      this.logger.log(`Removed ${String(removed)} deprecated catalog entries before reseed`);
    }

    for (const entry of entries) {
      ensureCatalogEntryHasReference(entry);
      const ollamaName = entry.ollamaName ?? `${entry.name}:${entry.tag}`;
      const [name, tag] = ollamaName.split(':');
      if (name && tag && isDeprecatedDefaultLocalModel(name, tag)) {
        continue;
      }
      await this.catalogRepository.upsertEntry(entry);
    }

    this.logger.log(`Model catalog seed complete (${String(entries.length)} entries upserted)`);
  }
}
