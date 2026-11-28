import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { Prisma, ResearchPlatform } from '../../../generated/prisma';

@Injectable()
export class ResearchPlatformRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<ResearchPlatform[]> {
    return this.prisma.researchPlatform.findMany({
      orderBy: [{ category: 'asc' }, { priority: 'asc' }, { slug: 'asc' }],
    });
  }

  /** Every enabled platform, lowest priority first (one query per platform run). */
  async findEnabled(): Promise<ResearchPlatform[]> {
    return this.prisma.researchPlatform.findMany({
      where: { enabled: true },
      orderBy: [{ priority: 'asc' }, { slug: 'asc' }],
    });
  }

  async findById(id: string): Promise<ResearchPlatform | null> {
    return this.prisma.researchPlatform.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<ResearchPlatform | null> {
    return this.prisma.researchPlatform.findUnique({ where: { slug } });
  }

  async listSlugs(): Promise<string[]> {
    const rows = await this.prisma.researchPlatform.findMany({ select: { slug: true } });
    return rows.map((row) => row.slug);
  }

  async create(data: Prisma.ResearchPlatformCreateInput): Promise<ResearchPlatform> {
    return this.prisma.researchPlatform.create({ data });
  }

  /** Inserts rows whose slug is new; an existing slug is skipped, never updated. */
  async createMissing(rows: Prisma.ResearchPlatformCreateManyInput[]): Promise<number> {
    const result = await this.prisma.researchPlatform.createMany({
      data: rows,
      skipDuplicates: true,
    });
    return result.count;
  }

  async update(id: string, data: Prisma.ResearchPlatformUpdateInput): Promise<ResearchPlatform> {
    return this.prisma.researchPlatform.update({ where: { id }, data });
  }

  async delete(id: string): Promise<ResearchPlatform> {
    return this.prisma.researchPlatform.delete({ where: { id } });
  }
}
