import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { WorkspaceConnectorStatus as WorkspaceConnectorStatusEnum } from '../../../common/enums/workspace-connector-status.enum';
import { WorkspaceSyncStatus as WorkspaceSyncStatusEnum } from '../../../common/enums/workspace-sync-status.enum';
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
import type { ScheduleCandidateFields, StaleCandidateFields } from '../types/sync-cadence.types';
import type { ListWorkspaceConnectorsQueryDto } from '../dto/list-workspace-connectors-query.dto';

@Injectable()
export class WorkspaceConnectorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.WorkspaceConnectorCreateInput): Promise<WorkspaceConnector> {
    return this.prisma.workspaceConnector.create({ data });
  }

  async createWithinLimit(
    userId: string,
    data: Prisma.WorkspaceConnectorCreateInput,
    limit: number | null,
  ): Promise<WorkspaceConnector | null> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`workspace:${userId}`}, 0))`;
      if (
        limit !== null &&
        (await transaction.workspaceConnector.count({ where: { userId } })) >= limit
      )
        return null;
      return transaction.workspaceConnector.create({ data });
    });
  }

  async findById(id: string): Promise<WorkspaceConnector | null> {
    return this.prisma.workspaceConnector.findUnique({ where: { id } });
  }

  // Phase 12 — batch lookup for "connectors shared with me": one query for
  // every connector referenced by the caller's grant rows, instead of N.
  async findManyByIds(ids: string[]): Promise<WorkspaceConnector[]> {
    if (ids.length === 0) return [];
    return this.prisma.workspaceConnector.findMany({ where: { id: { in: ids } } });
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

  async findSyncRunsByConnectorId(connectorId: string, limit: number): Promise<WorkspaceSyncRun[]> {
    return this.prisma.workspaceSyncRun.findMany({
      where: { connectorId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
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

  async findHealthEventsByConnectorId(
    connectorId: string,
    limit: number,
  ): Promise<WorkspaceHealthEvent[]> {
    return this.prisma.workspaceHealthEvent.findMany({
      where: { connectorId },
      orderBy: { checkedAt: 'desc' },
      take: limit,
    });
  }

  async getObjectCount(connectorId: string): Promise<number> {
    return this.prisma.workspaceObject.count({ where: { connectorId } });
  }

  /**
   * Connectors the scheduler might tick on this pass: enabled, not paused
   * and not in PENDING_AUTH / DISCONNECTED. Returns minimal projection.
   */
  async findScheduleCandidates(): Promise<
    Array<Pick<WorkspaceConnector, ScheduleCandidateFields>>
  > {
    return this.prisma.workspaceConnector.findMany({
      where: {
        isEnabled: true,
        status: {
          notIn: [
            WorkspaceConnectorStatusEnum.PAUSED,
            WorkspaceConnectorStatusEnum.PENDING_AUTH,
            WorkspaceConnectorStatusEnum.DISCONNECTED,
          ],
        },
      },
      select: {
        id: true,
        userId: true,
        provider: true,
        status: true,
        syncIntervalSeconds: true,
        lastSyncAt: true,
        lastTickAt: true,
      },
    });
  }

  async findStaleCandidates(
    olderThan: Date,
  ): Promise<Array<Pick<WorkspaceConnector, StaleCandidateFields>>> {
    return this.prisma.workspaceConnector.findMany({
      where: {
        isEnabled: true,
        status: {
          in: [WorkspaceConnectorStatusEnum.CONNECTED, WorkspaceConnectorStatusEnum.DEGRADED],
        },
        OR: [{ lastSyncAt: { lt: olderThan } }, { lastSyncAt: null }],
      },
      select: {
        id: true,
        userId: true,
        provider: true,
        status: true,
        lastSyncAt: true,
        syncIntervalSeconds: true,
      },
    });
  }

  async findInFlightRun(connectorId: string): Promise<WorkspaceSyncRun | null> {
    return this.prisma.workspaceSyncRun.findFirst({
      where: { connectorId, status: WorkspaceSyncStatusEnum.RUNNING },
      orderBy: { startedAt: 'desc' },
    });
  }

  async markOrphanedRunsAsFailed(olderThan: Date, reason: string): Promise<number> {
    const result = await this.prisma.workspaceSyncRun.updateMany({
      where: {
        status: WorkspaceSyncStatusEnum.RUNNING,
        startedAt: { lt: olderThan },
      },
      data: {
        status: WorkspaceSyncStatusEnum.FAILED,
        completedAt: new Date(),
        errorCode: 'OrphanedRunRecovered',
        errorMessage: reason,
      },
    });
    return result.count;
  }

  async updateCadence(connectorId: string, intervalSeconds: number): Promise<WorkspaceConnector> {
    return this.prisma.workspaceConnector.update({
      where: { id: connectorId },
      data: { syncIntervalSeconds: intervalSeconds },
    });
  }

  async markPaused(connectorId: string, reason: string | null): Promise<WorkspaceConnector> {
    return this.prisma.workspaceConnector.update({
      where: { id: connectorId },
      data: {
        status: WorkspaceConnectorStatusEnum.PAUSED,
        pausedAt: new Date(),
        pauseReason: reason ?? undefined,
      },
    });
  }

  async markResumed(connectorId: string): Promise<WorkspaceConnector> {
    return this.prisma.workspaceConnector.update({
      where: { id: connectorId },
      data: {
        status: WorkspaceConnectorStatusEnum.CONNECTED,
        pausedAt: null,
        pauseReason: null,
      },
    });
  }

  async markDegraded(connectorId: string, reason: string): Promise<WorkspaceConnector> {
    return this.prisma.workspaceConnector.update({
      where: { id: connectorId },
      data: { status: WorkspaceConnectorStatusEnum.DEGRADED, statusReason: reason },
    });
  }

  async markTick(connectorId: string, tickedAt: Date): Promise<void> {
    await this.prisma.workspaceConnector.update({
      where: { id: connectorId },
      data: { lastTickAt: tickedAt },
    });
  }
}
