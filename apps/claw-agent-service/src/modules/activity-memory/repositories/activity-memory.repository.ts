import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { ActivityMemoryEntry, Prisma } from '../../../generated/prisma';

@Injectable()
export class ActivityMemoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ActivityMemoryEntryCreateInput): Promise<ActivityMemoryEntry> {
    return this.prisma.activityMemoryEntry.create({ data });
  }

  async listForUser(
    userId: string,
    page: number,
    pageSize: number,
    kind?: string,
  ): Promise<{ data: ActivityMemoryEntry[]; total: number }> {
    const where: Prisma.ActivityMemoryEntryWhereInput = { userId };
    if (kind !== undefined) where.kind = kind;
    const [data, total] = await Promise.all([
      this.prisma.activityMemoryEntry.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.activityMemoryEntry.count({ where }),
    ]);
    return { data, total };
  }
}
