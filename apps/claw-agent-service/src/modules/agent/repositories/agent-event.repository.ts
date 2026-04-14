import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { Prisma } from '../../../generated/prisma';
import type { ListEventsQuery, PaginatedFileEvents } from '../types/agent.types';

@Injectable()
export class AgentEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(data: Prisma.FileWatchEventCreateManyInput[]): Promise<number> {
    const result = await this.prisma.fileWatchEvent.createMany({ data, skipDuplicates: true });
    return result.count;
  }

  async findAllByUser(userId: string, query: ListEventsQuery): Promise<PaginatedFileEvents> {
    const skip = (query.page - 1) * query.pageSize;
    const where: Prisma.FileWatchEventWhereInput = {
      userId,
      ...(query.sessionId !== undefined ? { sessionId: query.sessionId } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.fileWatchEvent.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.fileWatchEvent.count({ where }),
    ]);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }
}
