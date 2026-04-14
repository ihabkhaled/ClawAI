import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { TerminalCommandStatus } from '../../../common/enums/terminal-command-status.enum';
import type { Prisma, TerminalCommand } from '../../../generated/prisma';
import type { PaginatedCommands } from '../types/agent.types';
import type { ListCommandsQueryDto } from '../dto/list-commands-query.dto';

@Injectable()
export class AgentCommandRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.TerminalCommandCreateInput): Promise<TerminalCommand> {
    return this.prisma.terminalCommand.create({ data });
  }

  async findById(id: string): Promise<TerminalCommand | null> {
    return this.prisma.terminalCommand.findUnique({ where: { id } });
  }

  async findAll(query: ListCommandsQueryDto, userId: string): Promise<PaginatedCommands> {
    const skip = (query.page - 1) * query.pageSize;
    const where: Prisma.TerminalCommandWhereInput = {
      userId,
      ...(query.sessionId !== undefined ? { sessionId: query.sessionId } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.terminalCommand.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: { requestedAt: 'desc' },
      }),
      this.prisma.terminalCommand.count({ where }),
    ]);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async findApprovedForSession(sessionId: string): Promise<TerminalCommand[]> {
    return this.prisma.terminalCommand.findMany({
      where: {
        sessionId,
        status: TerminalCommandStatus.APPROVED,
        expiresAt: { gt: new Date() },
      },
      orderBy: { approvedAt: 'asc' },
      take: 5,
    });
  }

  async update(id: string, data: Prisma.TerminalCommandUpdateInput): Promise<TerminalCommand> {
    return this.prisma.terminalCommand.update({ where: { id }, data });
  }

  async tryStartExecution(id: string, sessionId: string): Promise<TerminalCommand | null> {
    const result = await this.prisma.terminalCommand.updateMany({
      where: { id, sessionId, status: TerminalCommandStatus.APPROVED },
      data: { status: TerminalCommandStatus.EXECUTING, startedAt: new Date() },
    });
    if (result.count === 0) return null;
    return this.prisma.terminalCommand.findUnique({ where: { id } });
  }

  async expireStaleCommands(before: Date): Promise<number> {
    const result = await this.prisma.terminalCommand.updateMany({
      where: { status: TerminalCommandStatus.PENDING_APPROVAL, expiresAt: { lt: before } },
      data: { status: TerminalCommandStatus.EXPIRED },
    });
    return result.count;
  }

  async resetStuckExecuting(before: Date): Promise<number> {
    const result = await this.prisma.terminalCommand.updateMany({
      where: { status: TerminalCommandStatus.EXECUTING, startedAt: { lt: before } },
      data: { status: TerminalCommandStatus.FAILED, stderr: 'Command timed out during execution' },
    });
    return result.count;
  }
}
