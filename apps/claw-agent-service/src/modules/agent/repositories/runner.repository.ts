import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { AgentSessionStatus } from '../../../common/enums/agent-session-status.enum';
import {
  RUNNER_LIST_LIMIT,
  RUNNER_METADATA_KIND,
  RUNNER_SELECT,
} from '../constants/runner.constants';
import type { RunnerRow } from '../types/runner.types';

/**
 * Runner reads. Every query is owner-scoped by `userId`; the session key is
 * never selected, so no runner listing can leak a credential.
 */
@Injectable()
export class RunnerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Connected runners whose last heartbeat is at or after `freshSince`. */
  async listConnected(userId: string, freshSince: Date): Promise<RunnerRow[]> {
    return this.prisma.agentSession.findMany({
      where: {
        userId,
        status: AgentSessionStatus.CONNECTED,
        lastHeartbeatAt: { gte: freshSince },
        metadata: { path: ['kind'], equals: RUNNER_METADATA_KIND },
      },
      orderBy: { lastHeartbeatAt: 'desc' },
      take: RUNNER_LIST_LIMIT,
      select: RUNNER_SELECT,
    });
  }

  async findOwned(id: string, userId: string): Promise<RunnerRow | null> {
    return this.prisma.agentSession.findFirst({
      where: { id, userId, metadata: { path: ['kind'], equals: RUNNER_METADATA_KIND } },
      select: RUNNER_SELECT,
    });
  }

  async findById(id: string): Promise<RunnerRow | null> {
    return this.prisma.agentSession.findFirst({
      where: { id, metadata: { path: ['kind'], equals: RUNNER_METADATA_KIND } },
      select: RUNNER_SELECT,
    });
  }

  /** A heartbeat revives an EXPIRED runner; a DISCONNECTED (revoked) one stays down. */
  async touchHeartbeat(id: string): Promise<number> {
    const result = await this.prisma.agentSession.updateMany({
      where: {
        id,
        status: { in: [AgentSessionStatus.CONNECTED, AgentSessionStatus.EXPIRED] },
      },
      data: {
        status: AgentSessionStatus.CONNECTED,
        lastHeartbeatAt: new Date(),
        disconnectedAt: null,
      },
    });
    return result.count;
  }

  async disconnect(id: string): Promise<void> {
    await this.prisma.agentSession.update({
      where: { id },
      data: { status: AgentSessionStatus.DISCONNECTED, disconnectedAt: new Date() },
    });
  }
}
