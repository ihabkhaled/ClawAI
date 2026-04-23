import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { Prisma, SearchProvider } from '../../../generated/prisma';

@Injectable()
export class SearchProviderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.SearchProviderCreateInput): Promise<SearchProvider> {
    return this.prisma.searchProvider.create({ data });
  }

  async findById(id: string): Promise<SearchProvider | null> {
    return this.prisma.searchProvider.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<SearchProvider | null> {
    return this.prisma.searchProvider.findUnique({ where: { name } });
  }

  async findFirstEnabled(): Promise<SearchProvider | null> {
    return this.prisma.searchProvider.findFirst({
      where: { enabled: true, status: 'ACTIVE' },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findEnabled(): Promise<SearchProvider[]> {
    return this.prisma.searchProvider.findMany({
      where: { enabled: true, status: 'ACTIVE' },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async list(): Promise<SearchProvider[]> {
    return this.prisma.searchProvider.findMany({ orderBy: [{ priority: 'asc' }, { name: 'asc' }] });
  }

  async update(id: string, data: Prisma.SearchProviderUpdateInput): Promise<SearchProvider> {
    return this.prisma.searchProvider.update({ where: { id }, data });
  }

  async delete(id: string): Promise<SearchProvider> {
    return this.prisma.searchProvider.delete({ where: { id } });
  }
}
