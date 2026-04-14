import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  Prisma,
  WorkspaceConnector,
  WorkspaceHealthEvent,
  WorkspaceSyncRun,
} from '../../../generated/prisma';
import type {
  PaginatedWorkspaceConnectors,
  WorkspaceConnectorWithStats,
} from '../types/workspace.types';
import type { ListWorkspaceConnectorsQueryDto } from '../dto/list-workspace-connectors-query.dto';

@Injectable()
export class WorkspaceConnectorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.WorkspaceConnectorCreateInput): Promise<WorkspaceConnector> {
    return this.prisma.workspaceConnector.create({ data });
  }

  async findById(id: string): Promise<WorkspaceConnector | null> {
    return this.prisma.workspaceConnector.findUnique({ where: { id } });
  }

  async findByIdWithStats(id: string): Promise<WorkspaceConnectorWithStats | null> {
    return this.prisma.workspaceConnector.findUnique({
      where: { id },
      include: {
        _count: { select: { syncRuns: true, healthEvents: true } },
        healthEvents: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
      },
    }) as Promise<WorkspaceConnectorWithStats | null>;
  }

  async findAllByUser(
    userId: string,
    query: ListWorkspaceConnectorsQueryDto,
  ): Promise<PaginatedWorkspaceConnectors> {
    const skip = (query.page - 1) * query.pageSize;
    const where: Prisma.WorkspaceConnectorWhereInput = {
      userId,
      ...(query.provider !== undefined ? { provider: query.provider } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.isEnabled !== undefined ? { isEnabled: query.isEnabled } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.workspaceConnector.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { syncRuns: true, healthEvents: true } },
          healthEvents: { orderBy: { checkedAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.workspaceConnector.count({ where }),
    ]);

    return {
      data: data as WorkspaceConnectorWithStats[],
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async update(
    id: string,
    data: Prisma.WorkspaceConnectorUpdateInput,
  ): Promise<WorkspaceConnector> {
    return this.prisma.workspaceConnector.update({ where: { id }, data });
  }

  async delete(id: string): Promise<WorkspaceConnector> {
    return this.prisma.workspaceConnector.delete({ where: { id } });
  }

  async createSyncRun(data: Prisma.WorkspaceSyncRunCreateInput): Promise<WorkspaceSyncRun> {
    return this.prisma.workspaceSyncRun.create({ data });
  }

  async updateSyncRun(
    id: string,
    data: Prisma.WorkspaceSyncRunUpdateInput,
  ): Promise<WorkspaceSyncRun> {
    return this.prisma.workspaceSyncRun.update({ where: { id }, data });
  }

  async createHealthEvent(
    data: Prisma.WorkspaceHealthEventCreateInput,
  ): Promise<WorkspaceHealthEvent> {
    return this.prisma.workspaceHealthEvent.create({ data });
  }

  async findLatestHealthEvent(connectorId: string): Promise<WorkspaceHealthEvent | null> {
    return this.prisma.workspaceHealthEvent.findFirst({
      where: { connectorId },
      orderBy: { checkedAt: 'desc' },
    });
  }

  async getObjectCount(connectorId: string): Promise<number> {
    return this.prisma.workspaceObject.count({ where: { connectorId } });
  }
}
