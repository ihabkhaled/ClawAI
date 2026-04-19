import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { DiscoverySource, Prisma } from '../../../generated/prisma';

@Injectable()
export class DiscoverySourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<DiscoverySource[]> {
    return this.prisma.discoverySource.findMany({
      orderBy: [{ isEnabled: 'desc' }, { name: 'asc' }],
    });
  }

  async findById(id: string): Promise<DiscoverySource | null> {
    return this.prisma.discoverySource.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<DiscoverySource | null> {
    return this.prisma.discoverySource.findUnique({ where: { name } });
  }

  async findEnabled(): Promise<DiscoverySource[]> {
    return this.prisma.discoverySource.findMany({
      where: { isEnabled: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: Prisma.DiscoverySourceCreateInput): Promise<DiscoverySource> {
    return this.prisma.discoverySource.create({ data });
  }

  async update(id: string, data: Prisma.DiscoverySourceUpdateInput): Promise<DiscoverySource> {
    return this.prisma.discoverySource.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.discoverySource.delete({ where: { id } });
  }

  async updateLastRun(id: string, lastRunAt: Date): Promise<void> {
    await this.prisma.discoverySource.update({
      where: { id },
      data: { lastRunAt },
    });
  }
}
