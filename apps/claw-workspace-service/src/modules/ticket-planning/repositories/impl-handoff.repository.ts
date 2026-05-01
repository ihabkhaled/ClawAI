import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  ImplPromptHandoff,
  ImplPromptHandoffMode,
  ImplPromptHandoffStatus,
} from '../../../generated/prisma';

@Injectable()
export class ImplHandoffRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    sourceQueueId: string;
    userId: string;
    mode: ImplPromptHandoffMode;
    briefSnippet: string;
  }): Promise<ImplPromptHandoff> {
    return this.prisma.implPromptHandoff.create({
      data: {
        sourceQueueId: input.sourceQueueId,
        userId: input.userId,
        mode: input.mode,
        briefSnippet: input.briefSnippet,
      },
    });
  }

  async markDelivered(
    id: string,
    fields: { targetThreadId?: string; targetTerminalCommandId?: string },
  ): Promise<ImplPromptHandoff> {
    return this.prisma.implPromptHandoff.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        targetThreadId: fields.targetThreadId,
        targetTerminalCommandId: fields.targetTerminalCommandId,
        deliveredAt: new Date(),
        errorMessage: null,
      },
    });
  }

  async markFailed(id: string, errorMessage: string): Promise<ImplPromptHandoff> {
    return this.prisma.implPromptHandoff.update({
      where: { id },
      data: { status: 'FAILED', errorMessage },
    });
  }

  async findById(id: string): Promise<ImplPromptHandoff | null> {
    return this.prisma.implPromptHandoff.findUnique({ where: { id } });
  }

  async listForUser(
    userId: string,
    statusFilter: ImplPromptHandoffStatus | undefined,
    limit: number,
  ): Promise<ImplPromptHandoff[]> {
    return this.prisma.implPromptHandoff.findMany({
      where: { userId, ...(statusFilter !== undefined ? { status: statusFilter } : {}) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, Math.max(1, limit)),
    });
  }
}
