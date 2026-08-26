import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  Prisma,
  WorkspaceChain,
  WorkspaceChainRun,
  WorkspaceChainRunStep,
} from '../../../generated/prisma';

@Injectable()
export class ChainRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Chain definitions ──────────────────────────────────
  async listForUser(userId: string): Promise<WorkspaceChain[]> {
    return this.prisma.workspaceChain.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<WorkspaceChain | null> {
    return this.prisma.workspaceChain.findUnique({ where: { id } });
  }

  async findByName(userId: string, name: string): Promise<WorkspaceChain | null> {
    return this.prisma.workspaceChain.findUnique({
      where: { userId_name: { userId, name } },
    });
  }

  async create(data: Prisma.WorkspaceChainUncheckedCreateInput): Promise<WorkspaceChain> {
    return this.prisma.workspaceChain.create({ data });
  }

  async update(id: string, data: Prisma.WorkspaceChainUpdateInput): Promise<WorkspaceChain> {
    return this.prisma.workspaceChain.update({ where: { id }, data });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.workspaceChain.delete({ where: { id } });
  }

  // ─── Runs ───────────────────────────────────────────────
  async createRun(data: Prisma.WorkspaceChainRunUncheckedCreateInput): Promise<WorkspaceChainRun> {
    return this.prisma.workspaceChainRun.create({ data });
  }

  async updateRun(
    id: string,
    data: Prisma.WorkspaceChainRunUpdateInput,
  ): Promise<WorkspaceChainRun> {
    return this.prisma.workspaceChainRun.update({ where: { id }, data });
  }

  async findRunWithSteps(
    id: string,
  ): Promise<(WorkspaceChainRun & { steps: WorkspaceChainRunStep[] }) | null> {
    return this.prisma.workspaceChainRun.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepIndex: 'asc' } } },
    });
  }

  async listRunsForChain(chainId: string, limit: number): Promise<WorkspaceChainRun[]> {
    return this.prisma.workspaceChainRun.findMany({
      where: { chainId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ─── Run steps ──────────────────────────────────────────
  async createStep(
    data: Prisma.WorkspaceChainRunStepUncheckedCreateInput,
  ): Promise<WorkspaceChainRunStep> {
    return this.prisma.workspaceChainRunStep.create({ data });
  }

  async updateStep(
    id: string,
    data: Prisma.WorkspaceChainRunStepUpdateInput,
  ): Promise<WorkspaceChainRunStep> {
    return this.prisma.workspaceChainRunStep.update({ where: { id }, data });
  }

  /**
   * Sweeps WorkspaceChainRun rows stuck in status=RUNNING longer than
   * olderThan and marks them FAILED. Mirrors
   * WorkspaceConnectorRepository.markOrphanedRunsAsFailed — without this,
   * a process crash mid-chain leaves an orphan row RUNNING forever, since
   * ChainExecutorManager.run() executes the whole chain synchronously in
   * one process with no separate heartbeat/lease to detect a dead worker.
   */
  async markOrphanedRunsAsFailed(olderThan: Date, reason: string): Promise<number> {
    const result = await this.prisma.workspaceChainRun.updateMany({
      where: {
        status: 'RUNNING',
        startedAt: { lt: olderThan },
      },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        error: reason,
      },
    });
    return result.count;
  }
}
