import { Injectable } from '@nestjs/common';

import { type LiveRunStatus } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { FENCED_RUN_STATUSES, RUN_LEASE_MS } from '../constants/processing.constants';
import { LeaseLostError } from '../errors/processing.errors';
import type { FencedTx, RunLease } from '../types/processing.types';

/**
 * Every worker write (architecture section 3). The transaction first renews the lease
 * with `updateMany({ id, generation, status in fenced })`; 0 rows (another worker took
 * over, the run stopped or was deleted) or a LiveRunTombstone aborts it with
 * LeaseLostError, so a stale worker can never write.
 */
@Injectable()
export class FencedRunWriter {
  constructor(private readonly prisma: PrismaService) {}

  commit<T>(lease: RunLease, write: (tx: FencedTx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const renewed = await tx.liveProcessingRun.updateMany({
        where: {
          id: lease.runId,
          generation: lease.generation,
          status: { in: [...FENCED_RUN_STATUSES] },
        },
        data: { leaseExpiresAt: new Date(now.getTime() + RUN_LEASE_MS), lastCommitAt: now },
      });
      if (renewed.count === 0) throw new LeaseLostError();
      const tombstone = await tx.liveRunTombstone.findUnique({ where: { runId: lease.runId } });
      if (tombstone) throw new LeaseLostError();
      return write(tx);
    });
  }

  /** Records how many seconds of a recorded video the run has transcribed (summary billing reads it). */
  async recordMediaProgress(lease: RunLease, seconds: number): Promise<void> {
    await this.commit(lease, (tx) =>
      tx.liveProcessingRun.update({
        where: { id: lease.runId },
        data: { processedMediaSeconds: Math.floor(seconds) },
      }),
    );
  }

  /** Renews the lease and returns the run's current status (one fenced round trip). */
  async renew(lease: RunLease): Promise<LiveRunStatus> {
    return this.commit(lease, async (tx) => {
      const run = await tx.liveProcessingRun.findUnique({
        where: { id: lease.runId },
        select: { status: true },
      });
      if (!run) throw new LeaseLostError();
      return run.status;
    });
  }
}
