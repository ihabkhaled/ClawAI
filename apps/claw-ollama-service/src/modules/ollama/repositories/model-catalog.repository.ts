import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  DownloadStatus,
  type ModelCatalogEntry,
  ModelCategory,
  type Prisma,
  RuntimeType,
} from '../../../generated/prisma';
import { type CatalogEntryInput, type CatalogFilters } from '../types/catalog.types';
import { type CatalogEntryDedupRef } from '../types/ollama.types';
import {
  resolveCatalogDownloadStatus,
  resolveCatalogSourceUrl,
} from '../utilities/catalog-reference.utility';
import { DEPRECATED_DEFAULT_LOCAL_MODEL_KEYS } from '../constants/default-models.constants';

@Injectable()
export class ModelCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    filters: CatalogFilters,
    page: number,
    limit: number,
  ): Promise<ModelCatalogEntry[]> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;

    return this.prisma.modelCatalogEntry.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ isRecommended: 'desc' }, { displayName: 'asc' }],
    });
  }

  async findById(id: string): Promise<ModelCatalogEntry | null> {
    return this.prisma.modelCatalogEntry.findUnique({ where: { id } });
  }

  async search(query: string): Promise<ModelCatalogEntry[]> {
    return this.prisma.modelCatalogEntry.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ isRecommended: 'desc' }, { displayName: 'asc' }],
      take: 50,
    });
  }

  async upsertEntry(entry: CatalogEntryInput): Promise<void> {
    const runtime = entry.runtime as RuntimeType;
    const category = entry.category as ModelCategory;
    const sourceUrl = resolveCatalogSourceUrl({ ...entry, runtime });
    const downloadStatus = resolveCatalogDownloadStatus({ ...entry, runtime });

    await this.prisma.modelCatalogEntry.upsert({
      where: { name_tag_runtime: { name: entry.name, tag: entry.tag, runtime } },
      update: {
        displayName: entry.displayName,
        category,
        description: entry.description,
        sizeBytes: null,
        parameterCount: entry.parameterCount,
        ollamaName: entry.ollamaName,
        sourceUrl,
        downloadStatus,
        isRecommended: entry.isRecommended,
        capabilities: [...entry.capabilities],
      },
      create: {
        name: entry.name,
        tag: entry.tag,
        displayName: entry.displayName,
        category,
        description: entry.description,
        sizeBytes: null,
        parameterCount: entry.parameterCount,
        runtime,
        ollamaName: entry.ollamaName,
        sourceUrl,
        downloadStatus,
        isRecommended: entry.isRecommended,
        capabilities: [...entry.capabilities],
      },
    });
  }

  async updateSourceUrlIfChanged(id: string, sourceUrl: string): Promise<void> {
    await this.prisma.modelCatalogEntry.updateMany({
      where: {
        id,
        OR: [{ sourceUrl: null }, { sourceUrl: { not: sourceUrl } }],
      },
      data: { sourceUrl },
    });
  }

  async deleteDeprecatedDefaults(): Promise<number> {
    const keys = [...DEPRECATED_DEFAULT_LOCAL_MODEL_KEYS];
    if (keys.length === 0) {
      return 0;
    }

    const result = await this.prisma.modelCatalogEntry.deleteMany({
      where: {
        runtime: RuntimeType.OLLAMA,
        OR: keys.map((key) => {
          const [name, tag] = key.split(':');
          if (tag) {
            return { name, tag };
          }
          return { name: key };
        }),
      },
    });

    return result.count;
  }

  async countAll(filters: CatalogFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.prisma.modelCatalogEntry.count({ where });
  }

  async createAdminEntry(data: Prisma.ModelCatalogEntryCreateInput): Promise<ModelCatalogEntry> {
    return this.prisma.modelCatalogEntry.create({ data });
  }

  async updateById(
    id: string,
    data: Prisma.ModelCatalogEntryUpdateInput,
  ): Promise<ModelCatalogEntry> {
    return this.prisma.modelCatalogEntry.update({ where: { id }, data });
  }

  async deleteById(id: string): Promise<ModelCatalogEntry | null> {
    return this.prisma.modelCatalogEntry.delete({ where: { id } }).catch(() => null);
  }

  async findByOllamaName(ollamaName: string): Promise<ModelCatalogEntry | null> {
    return this.prisma.modelCatalogEntry.findFirst({
      where: { ollamaName: { equals: ollamaName, mode: 'insensitive' } },
    });
  }

  async findByHardwareProfile(
    profile: string,
    runtime: RuntimeType,
    limit: number,
  ): Promise<ModelCatalogEntry[]> {
    return this.prisma.modelCatalogEntry.findMany({
      where: {
        runtime,
        hardwareProfiles: { has: profile },
        downloadStatus: { in: [DownloadStatus.AVAILABLE, DownloadStatus.UNKNOWN] },
      },
      orderBy: [{ isRecommended: 'desc' }, { displayName: 'asc' }],
      take: limit,
    });
  }

  async listByDownloadStatus(status: DownloadStatus, limit: number): Promise<ModelCatalogEntry[]> {
    return this.prisma.modelCatalogEntry.findMany({
      where: { downloadStatus: status },
      orderBy: [{ isRecommended: 'desc' }, { displayName: 'asc' }],
      take: limit,
    });
  }

  async findAllForDedup(): Promise<CatalogEntryDedupRef[]> {
    return this.prisma.modelCatalogEntry.findMany({
      select: { name: true, tag: true, ollamaName: true },
    });
  }

  async findAllForClassification(): Promise<ModelCatalogEntry[]> {
    return this.prisma.modelCatalogEntry.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateSearchBrowserScore(
    id: string,
    score: number,
    reasons: string[],
  ): Promise<ModelCatalogEntry> {
    return this.prisma.modelCatalogEntry.update({
      where: { id },
      data: {
        searchBrowserScore: score,
        searchBrowserScoreAt: new Date(),
        searchBrowserReasons: reasons,
      },
    });
  }

  private buildWhereClause(filters: CatalogFilters): Prisma.ModelCatalogEntryWhereInput {
    const where: Prisma.ModelCatalogEntryWhereInput = {};

    if (filters.category !== undefined) {
      where.category = filters.category;
    }

    if (filters.runtime !== undefined) {
      where.runtime = filters.runtime;
    }

    if (filters.downloadStatus !== undefined) {
      where.downloadStatus = filters.downloadStatus;
    }

    if (filters.search !== undefined && filters.search.length > 0) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.onlySearchBrowser === true || filters.searchBrowserMinScore !== undefined) {
      const minScore = filters.searchBrowserMinScore ?? 0.5;
      where.searchBrowserScore = { gte: minScore };
    }

    return where;
  }
}
