import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { AgentSessionStatus } from '../../../common/enums/agent-session-status.enum';
import type { AgentSession, Prisma } from '../../../generated/prisma';
import type { AgentSessionWithCounts, PaginatedAgentSessions } from '../types/agent.types';
import type { ListSessionsQueryDto } from '../dto/list-sessions-query.dto';

@Injectable()
export class AgentSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AgentSessionCreateInput): Promise<AgentSession> {
    return this.prisma.agentSession.create({ data });
  }

  async findById(id: string): Promise<AgentSessionWithCounts | null> {
    const result = await this.prisma.agentSession.findUnique({
      where: { id },
      include: {
        _count: { select: { commands: true, repos: true, fileEvents: true } },
      },
    });
    if (result === null) return null;
     
    const { sessionKey: _sk, ...rest } = result;
    return rest as AgentSessionWithCounts;
  }

  async findBySessionKey(sessionKey: string): Promise<AgentSession | null> {
    return this.prisma.agentSession.findUnique({ where: { sessionKey } });
  }

  async findAllByUser(
    userId: string,
    query: ListSessionsQueryDto,
  ): Promise<PaginatedAgentSessions> {
    const skip = (query.page - 1) * query.pageSize;
    const where: Prisma.AgentSessionWhereInput = {
      userId,
      ...(query.status !== undefined ? { status: query.status } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.agentSession.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: { connectedAt: 'desc' },
        include: { _count: { select: { commands: true, repos: true, fileEvents: true } } },
      }),
      this.prisma.agentSession.count({ where }),
    ]);
    // Strip sessionKey from every record — never expose in list responses
    const safeData = data.map(({ sessionKey: _sk, ...rest }) => rest) as AgentSessionWithCounts[];
    return { data: safeData, total, page: query.page, pageSize: query.pageSize };
  }

  async update(id: string, data: Prisma.AgentSessionUpdateInput): Promise<AgentSession> {
    return this.prisma.agentSession.update({ where: { id }, data });
  }

  async updateHeartbeat(id: string): Promise<AgentSession> {
    return this.prisma.agentSession.update({
      where: { id },
      data: { lastHeartbeatAt: new Date() },
    });
  }

  async findStaleSessions(cutoff: Date): Promise<AgentSession[]> {
    return this.prisma.agentSession.findMany({
      where: {
        status: AgentSessionStatus.CONNECTED,
        OR: [
          { lastHeartbeatAt: { lt: cutoff } },
          { lastHeartbeatAt: null, connectedAt: { lt: cutoff } },
        ],
      },
      select: { id: true } as Prisma.AgentSessionSelect,
    }) as Promise<AgentSession[]>;
  }

  async markExpired(ids: string[]): Promise<number> {
    const result = await this.prisma.agentSession.updateMany({
      where: { id: { in: ids } },
      data: { status: AgentSessionStatus.EXPIRED, disconnectedAt: new Date() },
    });
    return result.count;
  }
}
