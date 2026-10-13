import { Injectable } from '@nestjs/common';

import { CatalogSource } from '../../../common/enums/catalog-source.enum';
import { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import { toJsonValue } from '../../../common/utilities/to-json-value.utility';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type ExistingSeedEntry,
  type ExistingSeedVersion,
  type SeedEntryContent,
  type SeedToolData,
  type SeedVersionData,
} from '../types/seeding.types';

@Injectable()
export class CatalogSeedRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findEntryBySlug(slug: string): Promise<ExistingSeedEntry | null> {
    const entry = await this.prisma.pluginCatalogEntry.findUnique({ where: { slug } });
    if (entry === null) return null;
    const current =
      entry.currentVersionId === null
        ? null
        : await this.prisma.pluginVersion.findUnique({
            where: { id: entry.currentVersionId },
            select: { id: true, version: true },
          });
    return {
      id: entry.id,
      category: entry.category,
      publisher: entry.publisher,
      iconKey: entry.iconKey,
      homepageUrl: entry.homepageUrl,
      translations: entry.translations,
      currentVersion: current,
    };
  }

  /** Creates a published first-party entry with its first version and tools. */
  async createEntryWithVersion(
    slug: string,
    content: SeedEntryContent,
    version: SeedVersionData,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const entry = await tx.pluginCatalogEntry.create({
        data: {
          slug,
          source: CatalogSource.FIRST_PARTY,
          status: CatalogStatus.PUBLISHED,
          category: content.category,
          publisher: content.publisher,
          iconKey: content.iconKey,
          homepageUrl: content.homepageUrl,
          translations: toJsonValue(content.translations),
          versions: { create: [this.versionCreateData(version)] },
        },
        include: { versions: { select: { id: true } } },
      });
      const created = entry.versions[0];
      if (created !== undefined) {
        await tx.pluginCatalogEntry.update({
          where: { id: entry.id },
          data: { currentVersionId: created.id },
        });
      }
    });
  }

  /** Updates only the descriptive fields. Status, kill switch and featured are admin-owned. */
  async updateEntryContent(entryId: string, content: SeedEntryContent): Promise<void> {
    await this.prisma.pluginCatalogEntry.update({
      where: { id: entryId },
      data: {
        category: content.category,
        publisher: content.publisher,
        iconKey: content.iconKey,
        homepageUrl: content.homepageUrl,
        translations: toJsonValue(content.translations),
      },
    });
  }

  async findVersion(entryId: string, version: string): Promise<ExistingSeedVersion | null> {
    return this.prisma.pluginVersion.findUnique({
      where: { entryId_version: { entryId, version } },
      select: { id: true, manifestHash: true },
    });
  }

  /** Adds a version; when `makeCurrent` is set the entry points at it in the same transaction. */
  async addVersion(entryId: string, version: SeedVersionData, makeCurrent: boolean): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const created = await tx.pluginVersion.create({
        data: { entryId, ...this.versionCreateData(version) },
        select: { id: true },
      });
      if (makeCurrent) {
        await tx.pluginCatalogEntry.update({
          where: { id: entryId },
          data: { currentVersionId: created.id },
        });
      }
    });
  }

  async setCurrentVersion(entryId: string, versionId: string): Promise<void> {
    await this.prisma.pluginCatalogEntry.update({
      where: { id: entryId },
      data: { currentVersionId: versionId },
    });
  }

  private versionCreateData(version: SeedVersionData): {
    version: string;
    runtimeKind: SeedVersionData['runtimeKind'];
    manifest: ReturnType<typeof toJsonValue>;
    manifestHash: string;
    tools: { create: SeedToolData[] };
  } {
    return {
      version: version.version,
      runtimeKind: version.runtimeKind,
      manifest: toJsonValue(version.manifest),
      manifestHash: version.manifestHash,
      tools: { create: version.tools },
    };
  }
}
