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

  async listConnected(userId: string): Promise<RunnerRow[]> {
    return this.prisma.agentSession.findMany({
      where: {
        userId,
        status: AgentSessionStatus.CONNECTED,
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
}
