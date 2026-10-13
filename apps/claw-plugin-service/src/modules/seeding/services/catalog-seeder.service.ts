import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { RuntimeKind } from '../../../common/enums/runtime-kind.enum';
import { SeedOutcome } from '../../../common/enums/seed-outcome.enum';
import { type PluginManifest } from '../../catalog/schemas/plugin-manifest.schema';
import {
  canonicalJson,
  computeManifestHash,
} from '../../catalog/utilities/compute-manifest-hash.utility';
import { compareSemver } from '../../catalog/utilities/compare-semver.utility';
import { parsePluginManifest } from '../../catalog/utilities/parse-plugin-manifest.utility';
import { isRegisteredAdapterKey } from '../../runtime/utilities/is-registered-adapter.utility';
import { FIRST_PARTY_MANIFESTS } from '../constants/first-party-manifests.constants';
import { CatalogSeedRepository } from '../repositories/catalog-seed.repository';
import {
  type ExistingSeedEntry,
  type SeedEntryContent,
  type SeedSummary,
  type SeedVersionData,
} from '../types/seeding.types';

@Injectable()
export class CatalogSeederService implements OnModuleInit {
  private readonly logger = new Logger(CatalogSeederService.name);

  constructor(private readonly repository: CatalogSeedRepository) {}

  async onModuleInit(): Promise<void> {
    try {
      const summary = await this.seed();
      this.logger.log(
        `onModuleInit: catalog seeded created=${summary.created.length} updated=${summary.updated.length} unchanged=${summary.unchanged.length} skipped=${summary.skipped.length} versionBumpRequired=${summary.versionBumpRequired.length}`,
      );
    } catch (error) {
      this.logger.error(`onModuleInit: catalog seeding failed - ${(error as Error).message}`);
    }
  }

  /** Upserts every first-party manifest by slug and version. Safe to run on every boot. */
  async seed(): Promise<SeedSummary> {
    const summary: SeedSummary = {
      created: [],
      updated: [],
      unchanged: [],
      skipped: [],
      versionBumpRequired: [],
    };
    for (const input of FIRST_PARTY_MANIFESTS) {
      const parsed = parsePluginManifest(input);
      if (!parsed.ok) {
        this.logger.error(`seed: manifest rejected - ${parsed.errors.join('; ')}`);
        summary.skipped.push(input.slug);
        continue;
      }
      const manifest = parsed.manifest;
      if (!this.hasAdapter(manifest)) {
        this.logger.error(`seed: ${manifest.slug} names an unregistered adapter, skipping`);
        summary.skipped.push(manifest.slug);
        continue;
      }
      const outcome = await this.seedManifest(manifest);
      this.record(summary, outcome, manifest.slug);
    }
    return summary;
  }

  private record(summary: SeedSummary, outcome: SeedOutcome, slug: string): void {
    switch (outcome) {
      case SeedOutcome.CREATED:
        summary.created.push(slug);
        break;
      case SeedOutcome.UPDATED:
        summary.updated.push(slug);
        break;
      case SeedOutcome.UNCHANGED:
        summary.unchanged.push(slug);
        break;
      case SeedOutcome.VERSION_BUMP_REQUIRED:
        summary.versionBumpRequired.push(slug);
        break;
    }
  }

  private hasAdapter(manifest: PluginManifest): boolean {
    return (
      manifest.runtime.kind !== RuntimeKind.BUILTIN ||
      isRegisteredAdapterKey(manifest.runtime.adapterKey)
    );
  }

  private async seedManifest(manifest: PluginManifest): Promise<SeedOutcome> {
    const content = this.toContent(manifest);
    const version = this.toVersionData(manifest);
    const existing = await this.repository.findEntryBySlug(manifest.slug);
    if (existing === null) {
      await this.repository.createEntryWithVersion(manifest.slug, content, version);
      return SeedOutcome.CREATED;
    }
    const stored = await this.repository.findVersion(existing.id, version.version);
    // A published version is immutable: a changed manifest needs a new version.
    if (stored !== null && stored.manifestHash !== version.manifestHash) {
      this.logger.warn(
        `seed: ${manifest.slug}@${version.version} changed but the version was not bumped, skipping (${SeedOutcome.VERSION_BUMP_REQUIRED})`,
      );
      return SeedOutcome.VERSION_BUMP_REQUIRED;
    }
    let changed = false;
    if (this.contentDiffers(existing, content)) {
      await this.repository.updateEntryContent(existing.id, content);
      changed = true;
    }
    if (stored === null) {
      await this.repository.addVersion(existing.id, version, this.isNewer(existing, version));
      return SeedOutcome.UPDATED;
    }
    if (existing.currentVersion?.id !== stored.id && this.isNewer(existing, version)) {
      await this.repository.setCurrentVersion(existing.id, stored.id);
      changed = true;
    }
    return changed ? SeedOutcome.UPDATED : SeedOutcome.UNCHANGED;
  }

  private toContent(manifest: PluginManifest): SeedEntryContent {
    return {
      category: manifest.category,
      publisher: manifest.publisher,
      iconKey: manifest.iconKey,
      homepageUrl: manifest.homepageUrl ?? null,
      translations: manifest.translations,
    };
  }

  private toVersionData(manifest: PluginManifest): SeedVersionData {
    return {
      version: manifest.version,
      runtimeKind: manifest.runtime.kind,
      manifest,
      manifestHash: computeManifestHash(manifest),
      tools: manifest.tools.map((tool) => ({
        name: tool.name,
        riskLevel: tool.riskLevel,
        scopes: tool.scopes,
      })),
    };
  }

  private contentDiffers(existing: ExistingSeedEntry, content: SeedEntryContent): boolean {
    return (
      existing.category !== content.category ||
      existing.publisher !== content.publisher ||
      existing.iconKey !== content.iconKey ||
      existing.homepageUrl !== content.homepageUrl ||
      canonicalJson(existing.translations) !== canonicalJson(content.translations)
    );
  }

  /** True when the seeded version is newer than the entry's current one (or none is set). */
  private isNewer(existing: ExistingSeedEntry, version: SeedVersionData): boolean {
    return (
      existing.currentVersion === null ||
      compareSemver(version.version, existing.currentVersion.version) > 0
    );
  }
}
