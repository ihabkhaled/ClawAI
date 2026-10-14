import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import {
  AdminAuditAction,
  AdminAuditTarget,
  SYSTEM_ACTOR,
} from '../../../common/enums/admin-audit-action.enum';
import { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import { McpTransport } from '../../../common/enums/mcp-transport.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { computeManifestHash } from '../../catalog/utilities/compute-manifest-hash.utility';
import { CURATED_FIRST_VERSION, CURATED_PLACEHOLDER_TOOL } from '../constants/curation.constants';
import {
  CURATED_SEEDS,
  type CuratedSeed,
  SEED_NOTE_NO_URL,
  SEED_NOTE_REPO_URL,
} from '../constants/curated-seeds.constants';
import { CuratedManifestManager } from '../managers/curated-manifest.manager';
import { type CuratedSeedSummary } from '../types/curation.types';
import { seedAuth } from '../utilities/seed-auth.utility';
import { CuratedCatalogRepository } from '../repositories/curated-catalog.repository';
import { AdminAuditService } from './admin-audit.service';

/**
 * Seeds the curated remote entries as disabled drafts. Config is data, so this is the only code that
 * ever writes them, and only once: an entry that already exists (an admin may have edited, published
 * or deleted it) is never touched again. Safe to run on every boot; it soft-fails.
 */
@Injectable()
export class CuratedSeederService implements OnModuleInit {
  private readonly logger = new Logger(CuratedSeederService.name);

  constructor(
    private readonly repository: CuratedCatalogRepository,
    private readonly manifests: CuratedManifestManager,
    private readonly audit: AdminAuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const summary = await this.seed();
      this.logger.log(
        `onModuleInit: curated catalog seeded created=${String(summary.created.length)} unchanged=${String(summary.unchanged.length)} skipped=${String(summary.skipped.length)}`,
      );
    } catch (error) {
      this.logger.error(`onModuleInit: curated seeding failed - ${(error as Error).message}`);
    }
  }

  async seed(): Promise<CuratedSeedSummary> {
    const summary: CuratedSeedSummary = { created: [], unchanged: [], skipped: [] };
    for (const seed of CURATED_SEEDS) {
      if (await this.repository.slugExists(seed.slug)) {
        summary.unchanged.push(seed.slug);
        continue;
      }
      try {
        await this.create(seed);
        summary.created.push(seed.slug);
      } catch (error) {
        this.logger.error(`seed: ${seed.slug} skipped - ${(error as Error).message}`);
        summary.skipped.push(seed.slug);
      }
    }
    return summary;
  }

  private async create(seed: CuratedSeed): Promise<void> {
    const manifest = this.manifests.build({
      slug: seed.slug,
      version: CURATED_FIRST_VERSION,
      publisher: seed.publisher,
      category: seed.category,
      iconKey: seed.iconKey,
      translations: {
        en: { name: seed.name, summary: seed.summary, description: seed.description },
      },
      server: { url: seed.url, transport: McpTransport.STREAMABLE_HTTP },
      auth: seedAuth(seed.authKind),
      tools: [
        {
          name: CURATED_PLACEHOLDER_TOOL,
          description:
            'Placeholder. Open this entry in the admin screen, run Preview tools and save to replace it with the real tools.',
          riskLevel: RiskLevel.WRITE,
        },
      ],
    });
    await this.repository.create(
      {
        slug: seed.slug,
        status: CatalogStatus.DRAFT,
        globallyEnabled: false,
        needsVerification: true,
        category: manifest.category,
        publisher: manifest.publisher,
        iconKey: manifest.iconKey,
        homepageUrl: null,
        translations: manifest.translations,
        allowedPlanSlugs: [],
        adminNotes: seed.urlConfirmed ? SEED_NOTE_REPO_URL : SEED_NOTE_NO_URL,
        manifest,
        manifestHash: computeManifestHash(manifest),
      },
      CURATED_FIRST_VERSION,
    );
    await this.audit.record(
      SYSTEM_ACTOR,
      AdminAuditAction.CATALOG_SEEDED,
      AdminAuditTarget.CATALOG_ENTRY,
      seed.slug,
      { urlConfirmed: seed.urlConfirmed },
    );
  }
}
