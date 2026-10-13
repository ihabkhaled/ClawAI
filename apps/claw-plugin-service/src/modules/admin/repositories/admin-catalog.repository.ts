import { Injectable } from '@nestjs/common';

import { CatalogSource } from '../../../common/enums/catalog-source.enum';
import { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { type PluginCatalogEntry } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type AdminCatalogRecord,
  type AdminEntryChanges,
  type AdminToolChange,
} from '../types/admin.types';

@Injectable()
export class AdminCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Every entry, whatever its status or kill-switch state. */
  async findAll(): Promise<AdminCatalogRecord[]> {
    const entries = await this.prisma.pluginCatalogEntry.findMany({
      orderBy: [{ featured: 'desc' }, { slug: 'asc' }],
    });
    return this.withCurrentVersions(entries);
  }

  async findBySlug(slug: string): Promise<AdminCatalogRecord | null> {
    const entry = await this.prisma.pluginCatalogEntry.findUnique({ where: { slug } });
    if (entry === null) return null;
    const [record] = await this.withCurrentVersions([entry]);
    return record ?? null;
  }

  /** Applies the entry switches and the per-tool disables of the current version together. */
  async applyChanges(
    entryId: string,
    versionId: string | null,
    changes: AdminEntryChanges,
    tools: AdminToolChange[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (changes.globallyEnabled !== undefined || changes.featured !== undefined) {
        await tx.pluginCatalogEntry.update({ where: { id: entryId }, data: changes });
      }
      if (versionId === null) return;
      for (const tool of tools) {
        await tx.pluginTool.updateMany({
          where: { versionId, name: tool.name },
          data: { disabledByAdmin: tool.disabledByAdmin },
        });
      }
    });
  }

  private async withCurrentVersions(entries: PluginCatalogEntry[]): Promise<AdminCatalogRecord[]> {
    if (entries.length === 0) return [];
    const currentIds = entries
      .map((entry) => entry.currentVersionId)
      .filter((id): id is string => id !== null);
    const versions = await this.prisma.pluginVersion.findMany({
      where: { id: { in: currentIds } },
      include: { tools: { orderBy: { name: 'asc' } } },
    });
    return entries.map((entry) => {
      const current = versions.find((version) => version.id === entry.currentVersionId);
      return {
        id: entry.id,
        slug: entry.slug,
        source: CatalogSource[entry.source],
        status: CatalogStatus[entry.status],
        category: entry.category,
        publisher: entry.publisher,
        iconKey: entry.iconKey,
        translations: entry.translations,
        globallyEnabled: entry.globallyEnabled,
        featured: entry.featured,
        installCount: entry.installCount,
        currentVersion:
          current === undefined
            ? null
            : {
                id: current.id,
                version: current.version,
                tools: current.tools.map((tool) => ({
                  name: tool.name,
                  riskLevel: RiskLevel[tool.riskLevel],
                  disabledByAdmin: tool.disabledByAdmin,
                })),
              },
      };
    });
  }
}
