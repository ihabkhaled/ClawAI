import { Injectable } from '@nestjs/common';

import { CatalogSource } from '../../../common/enums/catalog-source.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { type PluginCatalogEntry } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { VISIBLE_ENTRY_WHERE } from '../constants/catalog-query.constants';
import { type CatalogEntryRecord } from '../types/catalog.types';

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Published, globally enabled entries, featured first then by slug. */
  async findVisibleEntries(category?: string): Promise<CatalogEntryRecord[]> {
    const entries = await this.prisma.pluginCatalogEntry.findMany({
      where: { ...VISIBLE_ENTRY_WHERE, ...(category === undefined ? {} : { category }) },
      orderBy: [{ featured: 'desc' }, { slug: 'asc' }],
    });
    return this.withVersions(entries);
  }

  async findVisibleEntryBySlug(slug: string): Promise<CatalogEntryRecord | null> {
    const entry = await this.prisma.pluginCatalogEntry.findFirst({
      where: { ...VISIBLE_ENTRY_WHERE, slug },
    });
    if (entry === null) return null;
    const [record] = await this.withVersions([entry]);
    return record ?? null;
  }

  /** Attaches the current version (with its tool rows) and every version number. */
  private async withVersions(entries: PluginCatalogEntry[]): Promise<CatalogEntryRecord[]> {
    if (entries.length === 0) return [];
    const versions = await this.prisma.pluginVersion.findMany({
      where: { entryId: { in: entries.map((entry) => entry.id) } },
      include: { tools: true },
      orderBy: { createdAt: 'desc' },
    });
    const records: CatalogEntryRecord[] = [];
    for (const entry of entries) {
      const own = versions.filter((version) => version.entryId === entry.id);
      const current = own.find((version) => version.id === entry.currentVersionId);
      if (current === undefined) continue;
      records.push({
        id: entry.id,
        slug: entry.slug,
        source: CatalogSource[entry.source],
        category: entry.category,
        publisher: entry.publisher,
        iconKey: entry.iconKey,
        homepageUrl: entry.homepageUrl,
        translations: entry.translations,
        featured: entry.featured,
        installCount: entry.installCount,
        currentVersion: {
          id: current.id,
          version: current.version,
          manifest: current.manifest,
          tools: current.tools.map((tool) => ({
            name: tool.name,
            riskLevel: RiskLevel[tool.riskLevel],
            disabledByAdmin: tool.disabledByAdmin,
          })),
        },
        versions: own.map((version) => version.version),
      });
    }
    return records;
  }
}
