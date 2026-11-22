import { Injectable } from '@nestjs/common';

import { LiveRunStatus, LiveSessionState, type Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { RUN_STATUSES_FINISHED, RUN_STATUSES_IN_USE } from '../constants/deletion.constants';
import type { DeletionResult, DeletionScope } from '../types/deletion.types';

@Injectable()
export class DeletionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOwnedSession(
    userId: string,
    sessionId: string,
  ): Promise<{ id: string; state: LiveSessionState } | null> {
    return this.prisma.liveViewerSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true, state: true },
    });
  }

  /**
   * Architecture section 8, in ONE transaction: the user's sessions (coverage and enhancements cascade),
   * then every run they referenced that no worker uses and no other viewer's coverage still points at.
   * LiveUsageCharge, LiveUsageMonth and LiveProviderCost rows are never touched.
   */
  deleteForScope(scope: DeletionScope): Promise<DeletionResult> {
    return this.prisma.$transaction(async (tx) => {
      const sessions = await tx.liveViewerSession.findMany({
        where: {
          userId: scope.userId,
          ...(scope.sessionId === undefined ? {} : { id: scope.sessionId }),
          ...(scope.includeActive ? {} : { state: LiveSessionState.DETACHED }),
        },
        select: { id: true, runId: true },
      });
      const sessionIds = sessions.map((session) => session.id);
      const skippedActive = scope.includeActive
        ? 0
        : await tx.liveViewerSession.count({
            where: {
              userId: scope.userId,
              ...(scope.sessionId === undefined ? {} : { id: scope.sessionId }),
              state: { not: LiveSessionState.DETACHED },
            },
          });
      const coverage = await tx.liveSessionCoverage.findMany({
        where: { sessionId: { in: sessionIds } },
        select: { runId: true },
        distinct: ['runId'],
      });
      const runIds = new Set<string>(coverage.map((row) => row.runId));
      for (const session of sessions) {
        if (session.runId !== null) runIds.add(session.runId);
      }
      await tx.liveViewerSession.deleteMany({ where: { id: { in: sessionIds } } });
      if (scope.purgeBillingState) {
        await tx.liveBillingState.deleteMany({ where: { userId: scope.userId } });
      }
      const tombstonedRunIds: string[] = [];
      for (const runId of runIds) {
        if (await this.tombstoneRunIfOrphaned(tx, runId)) tombstonedRunIds.push(runId);
      }
      return { sessionsDeleted: sessionIds.length, skippedActive, tombstonedRunIds };
    });
  }

  /** Finished runs no session references any more; each is tombstoned in its own transaction. */
  async sweepOrphanRuns(limit: number): Promise<string[]> {
    const candidates = await this.prisma.liveProcessingRun.findMany({
      where: { status: { in: RUN_STATUSES_FINISHED }, sessions: { none: {} } },
      select: { id: true },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
    const tombstoned: string[] = [];
    for (const { id } of candidates) {
      const removed = await this.prisma.$transaction((tx) => this.tombstoneRunIfOrphaned(tx, id));
      if (removed) tombstoned.push(id);
    }
    return tombstoned;
  }

  /** Removes a finished run's content when no one's coverage references it. True when it did. */
  private async tombstoneRunIfOrphaned(
    tx: Prisma.TransactionClient,
    runId: string,
  ): Promise<boolean> {
    const remaining = await tx.liveSessionCoverage.count({ where: { runId } });
    if (remaining > 0) return false;
    // The conditional update is the claim: a run a worker still uses, or one already deleted, matches nothing.
    const claimed = await tx.liveProcessingRun.updateMany({
      where: { id: runId, status: { notIn: [...RUN_STATUSES_IN_USE, LiveRunStatus.DELETED] } },
      data: { status: LiveRunStatus.DELETED, activeKey: null },
    });
    if (claimed.count === 0) return false;
    await tx.liveTranslation.deleteMany({ where: { runId } });
    await tx.liveFeedEvent.deleteMany({ where: { runId } });
    await tx.liveTranscriptSegment.deleteMany({ where: { runId } });
    await tx.liveMemorySnapshot.deleteMany({ where: { runId } });
    await tx.liveRunTombstone.createMany({ data: [{ runId }], skipDuplicates: true });
    return true;
  }
}
