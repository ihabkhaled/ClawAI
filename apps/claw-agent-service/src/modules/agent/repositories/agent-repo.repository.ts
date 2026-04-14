import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { LocalRepo, Prisma } from '../../../generated/prisma';
import type { PaginatedRepos } from '../types/agent.types';
import type { ListReposQueryDto } from '../dto/list-repos-query.dto';

@Injectable()
export class AgentRepoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.LocalRepoCreateInput): Promise<LocalRepo> {
    return this.prisma.localRepo.create({ data });
  }

  async findById(id: string): Promise<LocalRepo | null> {
    return this.prisma.localRepo.findUnique({ where: { id } });
  }

  async findAllByUser(userId: string, query: ListReposQueryDto): Promise<PaginatedRepos> {
    const skip = (query.page - 1) * query.pageSize;
    const where: Prisma.LocalRepoWhereInput = {
      userId,
      ...(query.sessionId !== undefined ? { sessionId: query.sessionId } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.localRepo.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.localRepo.count({ where }),
    ]);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async update(id: string, data: Prisma.LocalRepoUpdateInput): Promise<LocalRepo> {
    return this.prisma.localRepo.update({ where: { id }, data });
  }

  async delete(id: string): Promise<LocalRepo> {
    return this.prisma.localRepo.delete({ where: { id } });
  }
}
