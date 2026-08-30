import { Injectable, Logger } from '@nestjs/common';
import { ModelLifecycle, type Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type RouterModelCatalogEntry } from '../types/model-cost-catalog.types';
import {
  type FindExecutionCandidatesFilter,
  type RouterModelRegistryRecord,
} from '../types/router-model-registry.types';
import { mapPrismaToRecord } from '../utilities/router-model-record.utility';

@Injectable()
export class RouterModelRegistryRepository {
  private readonly logger = new Logger(RouterModelRegistryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<RouterModelRegistryRecord | null> {
    this.logger.debug(`findById id=${id}`);
    const row = await this.prisma.routerModelRegistry.findUnique({ where: { id } });
    return row ? mapPrismaToRecord(row) : null;
  }

  async findByProviderAndModelKey(
    provider: string,
    modelKey: string,
  ): Promise<RouterModelRegistryRecord | null> {
    this.logger.debug(`findByProviderAndModelKey provider=${provider} modelKey=${modelKey}`);
    const row = await this.prisma.routerModelRegistry.findUnique({
      where: { provider_modelKey: { provider, modelKey } },
    });
    return row ? mapPrismaToRecord(row) : null;
  }

  async list(filters: {
    provider?: string;
    lifecycle?: Prisma.RouterModelRegistryWhereInput['lifecycle'];
    isLocal?: boolean;
    isRouterOnly?: boolean;
    isExecutionCapable?: boolean;
    search?: string;
    skip: number;
    take: number;
  }): Promise<{ items: RouterModelRegistryRecord[]; total: number }> {
    const where: Prisma.RouterModelRegistryWhereInput = {};
    if (filters.provider !== undefined) where.provider = filters.provider;
    if (filters.lifecycle !== undefined) where.lifecycle = filters.lifecycle;
    if (filters.isLocal !== undefined) where.isLocal = filters.isLocal;
    if (filters.isRouterOnly !== undefined) where.isRouterOnly = filters.isRouterOnly;
    if (filters.isExecutionCapable !== undefined) {
      where.isExecutionCapable = filters.isExecutionCapable;
    }
    if (filters.search !== undefined && filters.search.length > 0) {
      where.OR = [
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { modelKey: { contains: filters.search, mode: 'insensitive' } },
        { family: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.routerModelRegistry.findMany({
        where,
        orderBy: [{ provider: 'asc' }, { displayName: 'asc' }],
        skip: filters.skip,
        take: filters.take,
      }),
      this.prisma.routerModelRegistry.count({ where }),
    ]);

    this.logger.debug(`list total=${total} returned=${rows.length}`);
    return { items: rows.map(mapPrismaToRecord), total };
  }

  /**
   * Every model an operator could publish a price for, as a narrow projection.
   *
   * REMOVED rows are excluded: a model that is gone from every provider cannot
   * be billed, so listing it would pad the "needs a price" count with work
   * nobody should do. Unpaginated on purpose — the caller is the admin cost
   * catalogue, which has to count fallbacks across the WHOLE registry to say
   * how many models still need a real rate.
   */
  async listCatalogEntries(): Promise<RouterModelCatalogEntry[]> {
    const rows = await this.prisma.routerModelRegistry.findMany({
      where: { lifecycle: { not: ModelLifecycle.REMOVED } },
      select: { provider: true, modelKey: true, displayName: true },
      orderBy: [{ provider: 'asc' }, { modelKey: 'asc' }],
    });
    this.logger.debug(`listCatalogEntries count=${rows.length}`);
    return rows;
  }

  async findExecutionCandidates(
    filter: FindExecutionCandidatesFilter,
  ): Promise<RouterModelRegistryRecord[]> {
    const where: Prisma.RouterModelRegistryWhereInput = {
      lifecycle: ModelLifecycle.ACTIVE,
      isExecutionCapable: true,
    };
    if (filter.excludeRouterOnly !== false) {
      where.isRouterOnly = false;
    }
    if (filter.requiredModalitiesIn !== undefined && filter.requiredModalitiesIn.length > 0) {
      where.modalitiesIn = { hasEvery: filter.requiredModalitiesIn };
    }
    if (filter.requiredModalitiesOut !== undefined && filter.requiredModalitiesOut.length > 0) {
      where.modalitiesOut = { hasEvery: filter.requiredModalitiesOut };
    }
    if (filter.domain !== undefined) {
      where.domainTags = { has: filter.domain };
    }
    if (filter.excludeProviders !== undefined && filter.excludeProviders.length > 0) {
      where.provider = { notIn: filter.excludeProviders };
    }
    const rows = await this.prisma.routerModelRegistry.findMany({ where });
    this.logger.debug(`findExecutionCandidates count=${rows.length}`);
    return rows.map(mapPrismaToRecord);
  }

  async create(data: Prisma.RouterModelRegistryCreateInput): Promise<RouterModelRegistryRecord> {
    this.logger.log(
      `create provider=${data.provider} modelKey=${data.modelKey} source=${data.metadataSource ?? 'unknown'}`,
    );
    const row = await this.prisma.routerModelRegistry.create({ data });
    return mapPrismaToRecord(row);
  }

  async update(
    id: string,
    data: Prisma.RouterModelRegistryUpdateInput,
  ): Promise<RouterModelRegistryRecord> {
    this.logger.log(`update id=${id}`);
    const row = await this.prisma.routerModelRegistry.update({ where: { id }, data });
    return mapPrismaToRecord(row);
  }

  async upsert(
    provider: string,
    modelKey: string,
    create: Prisma.RouterModelRegistryCreateInput,
    update: Prisma.RouterModelRegistryUpdateInput,
  ): Promise<RouterModelRegistryRecord> {
    this.logger.log(`upsert provider=${provider} modelKey=${modelKey}`);
    const row = await this.prisma.routerModelRegistry.upsert({
      where: { provider_modelKey: { provider, modelKey } },
      create,
      update,
    });
    return mapPrismaToRecord(row);
  }

  async softDelete(id: string): Promise<RouterModelRegistryRecord> {
    this.logger.log(`softDelete id=${id} -> lifecycle=REMOVED`);
    const row = await this.prisma.routerModelRegistry.update({
      where: { id },
      data: { lifecycle: ModelLifecycle.REMOVED },
    });
    return mapPrismaToRecord(row);
  }

  /// Phase 3: applies an intelligence enrichment to a row, marking
  /// `lastEnrichedAt = now()`. Sync workers call this with curated /
  /// heuristic blocks; the admin endpoint calls it with a sanitized PATCH
  /// payload. The caller is responsible for stripping protected keys.
  async patchIntelligence(
    id: string,
    enrichment: Prisma.RouterModelRegistryUpdateInput,
  ): Promise<RouterModelRegistryRecord> {
    this.logger.log(`patchIntelligence id=${id}`);
    const row = await this.prisma.routerModelRegistry.update({
      where: { id },
      data: { ...enrichment, lastEnrichedAt: new Date() },
    });
    return mapPrismaToRecord(row);
  }
}
