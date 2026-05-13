import { Injectable, Logger } from '@nestjs/common';
import { type FrontierCatalogEntry as PrismaCatalogRow } from '../../../generated/prisma';
import {
  type DownloadStatus,
  type LoadStatus,
  type ModelCategory,
  type QualityTier,
} from '../../../common/enums';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type CatalogEntry, type CatalogListFilters } from '../types/catalog.types';

@Injectable()
export class CatalogRepository {
  private readonly logger = new Logger(CatalogRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(filters: CatalogListFilters): Promise<{ rows: CatalogEntry[]; total: number }> {
    this.logger.debug(`list: filters=${JSON.stringify(filters)}`);
    const where = this.buildWhere(filters);
    const [rows, total] = await Promise.all([
      this.prisma.frontierCatalogEntry.findMany({
        where,
        orderBy: [
          { isRecommended: 'desc' },
          { totalParamsB: 'desc' },
          { name: 'asc' },
          { tag: 'asc' },
        ],
        take: filters.limit ?? 50,
      }),
      this.prisma.frontierCatalogEntry.count({ where }),
    ]);
    return { rows: rows.map((row) => this.toDomain(row)), total };
  }

  async findById(id: string): Promise<CatalogEntry | null> {
    const row = await this.prisma.frontierCatalogEntry.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByName(name: string, tag: string): Promise<CatalogEntry | null> {
    const row = await this.prisma.frontierCatalogEntry.findUnique({
      where: { name_tag: { name, tag } },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAllReadyForRouting(): Promise<CatalogEntry[]> {
    const rows = await this.prisma.frontierCatalogEntry.findMany({
      where: { downloadStatus: 'READY', available: true },
      orderBy: [{ name: 'asc' }, { tag: 'asc' }],
    });
    return rows.map((row) => this.toDomain(row));
  }

  async updateDownloadStatus(id: string, status: DownloadStatus): Promise<void> {
    this.logger.log(`updateDownloadStatus: ${id} → ${status}`);
    await this.prisma.frontierCatalogEntry.update({
      where: { id },
      data: { downloadStatus: status },
    });
  }

  async updateLoadStatus(id: string, status: LoadStatus): Promise<void> {
    this.logger.log(`updateLoadStatus: ${id} → ${status}`);
    await this.prisma.frontierCatalogEntry.update({ where: { id }, data: { loadStatus: status } });
  }

  async updateMetadata(
    id: string,
    payload: { fileSizeBytes?: bigint; manifestSha256?: string | null; available?: boolean },
  ): Promise<void> {
    await this.prisma.frontierCatalogEntry.update({ where: { id }, data: payload });
  }

  private buildWhere(filters: CatalogListFilters): {
    category?: ModelCategory;
    qualityTier?: QualityTier;
    available?: boolean;
  } {
    const where: { category?: ModelCategory; qualityTier?: QualityTier; available?: boolean } = {};
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.qualityTier) {
      where.qualityTier = filters.qualityTier;
    }
    where.available = true;
    return where;
  }

  private toDomain(row: PrismaCatalogRow): CatalogEntry {
    return {
      id: row.id,
      name: row.name,
      tag: row.tag,
      displayName: row.displayName,
      category: row.category as ModelCategory,
      description: row.description,
      parameterCount: row.parameterCount,
      totalParamsB: row.totalParamsB,
      activeParamsB: row.activeParamsB,
      contextLength: row.contextLength,
      capabilities: row.capabilities,
      license: row.license,
      huggingfaceRepo: row.huggingfaceRepo,
      filePattern: row.filePattern,
      manifestSha256: row.manifestSha256,
      fileSizeBytes: row.fileSizeBytes,
      requiredRamGb: row.requiredRamGb,
      recommendedRamGb: row.recommendedRamGb,
      requiredDiskGb: row.requiredDiskGb,
      recommendedGpuVramGb: row.recommendedGpuVramGb,
      isRecommended: row.isRecommended,
      qualityTier: row.qualityTier as QualityTier,
      sourceUrl: row.sourceUrl,
      chatTemplate: row.chatTemplate,
      available: row.available,
      downloadStatus: row.downloadStatus as DownloadStatus,
      loadStatus: row.loadStatus as LoadStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
