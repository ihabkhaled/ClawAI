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

  async findByIdForUser(id: string, userId: string): Promise<ScheduledCommand | null> {
    const row = await this.prisma.scheduledCommand.findUnique({ where: { id } });
    if (row?.userId !== userId) return null;
    return row;
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
