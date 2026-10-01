import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ScheduledCommandStatus } from '../../../common/enums/scheduled-command-status.enum';
import type { Prisma, ScheduledCommand } from '../../../generated/prisma';

@Injectable()
export class ScheduledCommandRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ScheduledCommandCreateInput): Promise<ScheduledCommand> {
    return this.prisma.scheduledCommand.create({ data });
  }

  async findDueForUser(now: Date, limit: number): Promise<ScheduledCommand[]> {
    return this.prisma.scheduledCommand.findMany({
      where: {
        status: ScheduledCommandStatus.ENABLED,
        nextRunAt: { lte: now },
      },
      orderBy: { nextRunAt: 'asc' },
      take: limit,
    });
  }

  /** Unscoped by owner: only the webhook receiver uses it, and it verifies a signature first. */
  async findById(id: string): Promise<ScheduledCommand | null> {
    return this.prisma.scheduledCommand.findUnique({ where: { id } });
  }

  async setWebhookEnabled(id: string, enabled: boolean): Promise<ScheduledCommand> {
    return this.prisma.scheduledCommand.update({
      where: { id },
      data: { webhookEnabled: enabled },
    });
  }

  /** Retires the current webhook secret: the next one derives from the new version. */
  async rotateWebhookSecret(id: string): Promise<ScheduledCommand> {
    return this.prisma.scheduledCommand.update({
      where: { id },
      data: { webhookSecretVersion: { increment: 1 } },
    });
  }

  async findByIdForUser(id: string, userId: string): Promise<ScheduledCommand | null> {
    const row = await this.prisma.scheduledCommand.findUnique({ where: { id } });
    return row?.userId !== userId ? null : row;
  }

  async listByUser(userId: string): Promise<ScheduledCommand[]> {
    return this.prisma.scheduledCommand.findMany({
      where: { userId },
      orderBy: [{ status: 'asc' }, { nextRunAt: 'asc' }],
    });
  }

  async markRun(id: string, lastCommandId: string, nextRunAt: Date): Promise<ScheduledCommand> {
    return this.prisma.scheduledCommand.update({
      where: { id },
      data: { lastRunAt: new Date(), lastCommandId, nextRunAt },
    });
  }

  async setStatus(id: string, status: ScheduledCommandStatus): Promise<ScheduledCommand> {
    return this.prisma.scheduledCommand.update({ where: { id }, data: { status } });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.scheduledCommand.delete({ where: { id } });
  }
}
