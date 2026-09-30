import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { AgentSessionStatus } from '../../../common/enums/agent-session-status.enum';
import { RUNNER_METADATA_KIND } from '../constants/runner.constants';
import type { RunnerCredentialIdentity } from '../types/runner.types';

/**
 * F100 runner credentials. Stores and matches only the token digest; no read
 * here ever returns the hash to a caller outside the guard path.
 */
@Injectable()
export class RunnerCredentialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async issue(
    sessionId: string,
    userId: string,
    tokenHash: string,
    tokenPrefix: string,
  ): Promise<void> {
    await this.prisma.runnerCredential.create({
      data: { session: { connect: { id: sessionId } }, userId, tokenHash, tokenPrefix },
    });
  }

  /**
   * Replaces the digest in place, so the previous token stops working the
   * moment this returns. Also clears a revocation: rotating is how an owner
   * re-admits a runner it had cut off. A runner registered before
   * credentials existed gets its first one here.
   */
  async rotate(
    sessionId: string,
    userId: string,
    tokenHash: string,
    tokenPrefix: string,
  ): Promise<void> {
    await this.prisma.runnerCredential.upsert({
      where: { sessionId },
      update: { tokenHash, tokenPrefix, rotatedAt: new Date(), revokedAt: null },
      create: { session: { connect: { id: sessionId } }, userId, tokenHash, tokenPrefix },
    });
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.runnerCredential.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * The runner a live token belongs to: not revoked, still a runner session,
   * and not disconnected by its owner. An EXPIRED session still authenticates
   * so its heartbeat can bring it back; claiming checks freshness separately.
   */
  async findActiveByHash(tokenHash: string): Promise<RunnerCredentialIdentity | null> {
    const row = await this.prisma.runnerCredential.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        session: {
          status: { not: AgentSessionStatus.DISCONNECTED },
          metadata: { path: ['kind'], equals: RUNNER_METADATA_KIND },
        },
      },
      select: { sessionId: true, userId: true },
    });
    return row;
  }

  async touch(sessionId: string): Promise<void> {
    await this.prisma.runnerCredential.update({
      where: { sessionId },
      data: { lastUsedAt: new Date() },
    });
  }
}
