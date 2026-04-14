import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { Prisma, WorkspaceAction } from '../../../generated/prisma';
import type {
  PaginatedWorkspaceActions,
  WorkspaceActionWithConnector,
} from '../types/action.types';
import type { ListActionsQueryDto } from '../dto/list-actions.dto';
import { WorkspaceActionStatus } from '../../../common/enums/workspace-action-status.enum';

@Injectable()
export class WorkspaceActionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.WorkspaceActionCreateInput): Promise<WorkspaceAction> {
    return this.prisma.workspaceAction.create({ data });
  }

  async findById(id: string): Promise<WorkspaceActionWithConnector | null> {
    return this.prisma.workspaceAction.findUnique({
      where: { id },
      include: { connector: { select: { id: true, name: true, provider: true } } },
    }) as Promise<WorkspaceActionWithConnector | null>;
  }

  async findAllByUser(
    userId: string,
    query: ListActionsQueryDto,
  ): Promise<PaginatedWorkspaceActions> {
    const skip = (query.page - 1) * query.pageSize;
    const where: Prisma.WorkspaceActionWhereInput = {
      userId,
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.connectorId !== undefined ? { connectorId: query.connectorId } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.workspaceAction.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: { requestedAt: 'desc' },
        include: { connector: { select: { id: true, name: true, provider: true } } },
      }),
      this.prisma.workspaceAction.count({ where }),
    ]);

    return {
      data: data as WorkspaceActionWithConnector[],
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async update(
    id: string,
    data: Prisma.WorkspaceActionUpdateInput,
  ): Promise<WorkspaceActionWithConnector> {
    return this.prisma.workspaceAction.update({
      where: { id },
      data,
      include: { connector: { select: { id: true, name: true, provider: true } } },
    }) as Promise<WorkspaceActionWithConnector>;
  }

  async expireStalePending(): Promise<number> {
    const result = await this.prisma.workspaceAction.updateMany({
      where: {
        status: WorkspaceActionStatus.PENDING_APPROVAL,
        expiresAt: { lt: new Date() },
      },
      data: { status: WorkspaceActionStatus.EXPIRED },
    });
    return result.count;
  }
}
