import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  CreateQueueRowInput,
  ListQueueFilters,
  UpdateStatusExtra,
} from '../types/ai-action-policy.types';
import type { AiActionApprovalQueue, AiActionQueueStatus, Prisma } from '../../../generated/prisma';

@Injectable()
export class AiActionApprovalQueueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateQueueRowInput): Promise<AiActionApprovalQueue> {
    return this.prisma.aiActionApprovalQueue.create({
      data: {
        userId: input.userId,
        connectorId: input.connectorId,
        actionKind: input.actionKind,
        provider: input.provider,
        status: input.status,
        draftPayload: input.draftPayload,
        riskLabel: input.riskLabel,
        riskScore: input.riskScore,
        riskReasons: input.riskReasons,
        matchedPolicyId: input.matchedPolicyId,
        matchedPolicyName: input.matchedPolicyName,
        generatedBy: input.generatedBy,
        sourceObjectId: input.sourceObjectId,
        expiresAt: input.expiresAt,
        statusChangedAt: new Date(),
        rejectionReason: input.rejectionReason ?? null,
      },
    });
  }

  async findById(id: string): Promise<AiActionApprovalQueue | null> {
    return this.prisma.aiActionApprovalQueue.findUnique({ where: { id } });
  }

  async findByIdAndUser(id: string, userId: string): Promise<AiActionApprovalQueue | null> {
    return this.prisma.aiActionApprovalQueue.findFirst({ where: { id, userId } });
  }

  async list(filters: ListQueueFilters): Promise<AiActionApprovalQueue[]> {
    return this.prisma.aiActionApprovalQueue.findMany({
      where: {
        ...(filters.userId !== undefined ? { userId: filters.userId } : {}),
        ...(filters.status !== undefined ? { status: filters.status } : {}),
        ...(filters.provider !== undefined ? { provider: filters.provider } : {}),
        ...(filters.actionKind !== undefined ? { actionKind: filters.actionKind } : {}),
        ...(filters.riskLabel !== undefined ? { riskLabel: filters.riskLabel } : {}),
      },
      take: filters.limit,
      ...(filters.cursor !== undefined
        ? { skip: 1, cursor: { id: filters.cursor } }
        : {}),
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    id: string,
    status: AiActionQueueStatus,
    extra?: UpdateStatusExtra,
  ): Promise<AiActionApprovalQueue> {
    const data: Prisma.AiActionApprovalQueueUpdateInput = {
      status,
      statusChangedAt: new Date(),
    };
    if (extra?.editedPayload !== undefined) data.editedPayload = extra.editedPayload;
    if (extra?.rejectionReason !== undefined) data.rejectionReason = extra.rejectionReason;
    if (extra?.errorMessage !== undefined) data.errorMessage = extra.errorMessage;
    if (extra?.workspaceActionId !== undefined) data.workspaceActionId = extra.workspaceActionId;
    return this.prisma.aiActionApprovalQueue.update({ where: { id }, data });
  }

  async findExpired(now: Date, limit: number): Promise<AiActionApprovalQueue[]> {
    return this.prisma.aiActionApprovalQueue.findMany({
      where: {
        status: { in: ['PENDING_APPROVAL'] },
        expiresAt: { lt: now },
      },
      take: limit,
      orderBy: { expiresAt: 'asc' },
    });
  }

  async existsActiveForSourceAndKind(
    userId: string,
    sourceObjectId: string,
    actionKind: string,
  ): Promise<boolean> {
    const found = await this.prisma.aiActionApprovalQueue.findFirst({
      where: {
        userId,
        sourceObjectId,
        actionKind,
        status: { in: ['PENDING_APPROVAL', 'AUTO_APPROVED', 'APPROVED', 'EXECUTING'] },
      },
      select: { id: true },
    });
    return found !== null;
  }
}
