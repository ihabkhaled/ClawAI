import { Injectable } from '@nestjs/common';

import { CatalogHealthStatus } from '../../../common/enums/catalog-health-status.enum';
import { CatalogSource } from '../../../common/enums/catalog-source.enum';
import { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { RuntimeKind } from '../../../common/enums/runtime-kind.enum';
import { toJsonValue } from '../../../common/utilities/to-json-value.utility';
import { type PluginCatalogEntry } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { CURATED_LIST_MAX } from '../constants/curation.constants';
import {
  type CuratedEntryUpdate,
  type CuratedRecord,
  type HealthWrite,
  type NewCuratedEntry,
  type NewVersionWrite,
} from '../types/curation.types';

@Injectable()
export class CuratedCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllCurated(includeDeleted: boolean): Promise<CuratedRecord[]> {
    const entries = await this.prisma.pluginCatalogEntry.findMany({
      where: {
        source: CatalogSource.CURATED_MCP,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: [{ slug: 'asc' }],
      take: CURATED_LIST_MAX,
    });
    return this.withCurrent(entries);
  }

  async findBySlug(slug: string): Promise<CuratedRecord | null> {
    const entry = await this.prisma.pluginCatalogEntry.findUnique({ where: { slug } });
    if (entry === null) return null;
    const [record] = await this.withCurrent([entry]);
    return record ?? null;
  }

  async slugExists(slug: string): Promise<boolean> {
    const row = await this.prisma.pluginCatalogEntry.findUnique({
      where: { slug },
      select: { id: true },
    });
    return row !== null;
  }

  async create(input: NewCuratedEntry, version: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const entry = await tx.pluginCatalogEntry.create({
        data: {
          slug: input.slug,
          source: CatalogSource.CURATED_MCP,
          status: input.status,
          globallyEnabled: input.globallyEnabled,
          needsVerification: input.needsVerification,
          category: input.category,
          publisher: input.publisher,
          iconKey: input.iconKey,
          homepageUrl: input.homepageUrl,
          translations: toJsonValue(input.translations),
          allowedPlanSlugs: input.allowedPlanSlugs,
          adminNotes: input.adminNotes,
          versions: {
            create: [
              {
                version,
                runtimeKind: RuntimeKind.MCP_REMOTE,
                manifest: toJsonValue(input.manifest),
                manifestHash: input.manifestHash,
                tools: {
                  create: input.manifest.tools.map((tool) => ({
                    name: tool.name,
                    riskLevel: tool.riskLevel,
                    scopes: tool.scopes,
                  })),
                },
              },
            ],
          },
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

  /** Updates the entry and, when a version is given, adds it and makes it current, all or nothing. */
  async update(
    entryId: string,
    update: CuratedEntryUpdate,
    version: NewVersionWrite | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.pluginCatalogEntry.update({
        where: { id: entryId },
        data: {
          status: update.status,
          needsVerification: update.needsVerification,
          category: update.category,
          publisher: update.publisher,
          iconKey: update.iconKey,
          homepageUrl: update.homepageUrl,
          translations: toJsonValue(update.translations),
          allowedPlanSlugs: update.allowedPlanSlugs,
          adminNotes: update.adminNotes,
        },
      });
      if (version === null) return;
      const created = await tx.pluginVersion.create({
        data: {
          entryId,
          version: version.version,
          runtimeKind: RuntimeKind.MCP_REMOTE,
          manifest: toJsonValue(version.manifest),
          manifestHash: version.manifestHash,
          tools: {
            create: version.manifest.tools.map((tool) => ({
              name: tool.name,
              riskLevel: tool.riskLevel,
              scopes: tool.scopes,
              disabledByAdmin: version.disabledTools.includes(tool.name),
            })),
          },
        },
        select: { id: true },
      });
      await tx.pluginCatalogEntry.update({
        where: { id: entryId },
        data: { currentVersionId: created.id },
      });
    });
  }

  async setEnabled(entryId: string, enabled: boolean): Promise<void> {
    await this.prisma.pluginCatalogEntry.update({
      where: { id: entryId },
      data: { globallyEnabled: enabled },
    });
  }

  /** Hides the entry from every user and keeps the row: installs read UNAVAILABLE and the slug stays taken. */
  async softDelete(entryId: string): Promise<void> {
    await this.prisma.pluginCatalogEntry.update({
      where: { id: entryId },
      data: {
        deletedAt: new Date(),
        status: CatalogStatus.HIDDEN,
        globallyEnabled: false,
        featured: false,
      },
    });
  }

  async writeHealth(entryId: string, health: HealthWrite): Promise<void> {
    await this.prisma.pluginCatalogEntry.update({
      where: { id: entryId },
      data: {
        healthStatus: health.status,
        healthLatencyMs: health.latencyMs,
        healthErrorCode: health.errorCode,
        healthCheckedAt: new Date(),
      },
    });
  }

  private async withCurrent(entries: PluginCatalogEntry[]): Promise<CuratedRecord[]> {
    if (entries.length === 0) return [];
    const ids = entries
      .map((entry) => entry.currentVersionId)
      .filter((id): id is string => id !== null);
    const versions = await this.prisma.pluginVersion.findMany({
      where: { id: { in: ids } },
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
        homepageUrl: entry.homepageUrl,
        translations: entry.translations,
        globallyEnabled: entry.globallyEnabled,
        featured: entry.featured,
        installCount: entry.installCount,
        deletedAt: entry.deletedAt,
        adminNotes: entry.adminNotes,
        needsVerification: entry.needsVerification,
        allowedPlanSlugs: entry.allowedPlanSlugs,
        health: {
          status: CatalogHealthStatus[entry.healthStatus],
          latencyMs: entry.healthLatencyMs,
          checkedAt: entry.healthCheckedAt,
          errorCode: entry.healthErrorCode,
        },
        current:
          current === undefined
            ? null
            : {
                id: current.id,
                version: current.version,
                manifest: current.manifest,
                manifestHash: current.manifestHash,
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
