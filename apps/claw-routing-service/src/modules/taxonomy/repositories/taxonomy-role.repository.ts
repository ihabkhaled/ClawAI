import { Injectable, Logger } from '@nestjs/common';
import { type DomainTag, type Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type TaxonomyRoleRecord } from '../types/taxonomy.types';

@Injectable()
export class TaxonomyRoleRepository {
  private readonly logger = new Logger(TaxonomyRoleRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TaxonomyRoleRecord | null> {
    const row = await this.prisma.taxonomyRole.findUnique({ where: { id } });
    return row;
  }

  async findByKey(roleKey: string): Promise<TaxonomyRoleRecord | null> {
    const row = await this.prisma.taxonomyRole.findUnique({ where: { roleKey } });
    return row;
  }

  async list(filters: {
    industry?: string;
    domain?: DomainTag;
    search?: string;
    skip: number;
    take: number;
  }): Promise<{ items: TaxonomyRoleRecord[]; total: number }> {
    const where: Prisma.TaxonomyRoleWhereInput = {};
    if (filters.industry !== undefined) where.industryKey = filters.industry;
    if (filters.domain !== undefined) where.domainKey = filters.domain;
    if (filters.search !== undefined && filters.search.length > 0) {
      where.OR = [
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { roleKey: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.taxonomyRole.findMany({
        where,
        orderBy: { roleKey: 'asc' },
        skip: filters.skip,
        take: filters.take,
      }),
      this.prisma.taxonomyRole.count({ where }),
    ]);
    this.logger.debug(`list total=${total} returned=${rows.length}`);
    return { items: rows, total };
  }

  async create(data: Prisma.TaxonomyRoleCreateInput): Promise<TaxonomyRoleRecord> {
    this.logger.log(`create roleKey=${data.roleKey}`);
    return this.prisma.taxonomyRole.create({ data });
  }

  async upsertByKey(
    roleKey: string,
    create: Prisma.TaxonomyRoleCreateInput,
    update: Prisma.TaxonomyRoleUpdateInput,
  ): Promise<TaxonomyRoleRecord> {
    return this.prisma.taxonomyRole.upsert({
      where: { roleKey },
      create,
      update,
    });
  }
}
