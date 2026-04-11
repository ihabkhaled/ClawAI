import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type ModelCatalogEntry, type Prisma } from '../../../generated/prisma';
import { type CatalogFilters } from '../types/catalog.types';

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

  async countAll(filters: CatalogFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.prisma.modelCatalogEntry.count({ where });
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

  private buildWhereClause(filters: CatalogFilters): Prisma.ModelCatalogEntryWhereInput {
    const where: Prisma.ModelCatalogEntryWhereInput = {};

    if (filters.category !== undefined) {
      where.category = filters.category;
    }

    if (filters.runtime !== undefined) {
      where.runtime = filters.runtime;
    }

    if (filters.search !== undefined && filters.search.length > 0) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
