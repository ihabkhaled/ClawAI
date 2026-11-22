import { Injectable } from '@nestjs/common';

import {
  type LiveMode,
  type LiveProcessingRun,
  LiveRunStatus,
  type LiveStream,
} from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  ATTACHED_SESSION_STATES,
  LIVE_RUN_STATUSES,
  RUN_LEASE_SECONDS,
} from '../constants/processing.constants';
import type { ClaimedRunRow } from '../types/processing.types';

/** Unfenced run queries: attach, admission, claim. Worker writes go through FencedRunWriter. */
@Injectable()
export class ProcessingRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  findStream(streamId: string): Promise<LiveStream | null> {
    return this.prisma.liveStream.findUnique({ where: { id: streamId } });
  }

  findByActiveKey(activeKey: string): Promise<LiveProcessingRun | null> {
    return this.prisma.liveProcessingRun.findUnique({ where: { activeKey } });
  }

  createRun(
    streamId: string,
    processingKey: string,
    mode: LiveMode,
    pipelineVersion: number,
  ): Promise<LiveProcessingRun> {
    return this.prisma.liveProcessingRun.create({
      data: {
        streamId,
        processingKey,
        activeKey: processingKey,
        mode,
        pipelineVersion,
        status: LiveRunStatus.PENDING,
      },
    });
  }

  countAttachedViewers(runId: string): Promise<number> {
    return this.prisma.liveViewerSession.count({
      where: { runId, state: { in: [...ATTACHED_SESSION_STATES] } },
    });
  }

  /** Last viewer gone: STOPPING immediately and free the activeKey for a fresh run. */
  async markStopping(runId: string): Promise<number> {
    const result = await this.prisma.liveProcessingRun.updateMany({
      where: { id: runId, status: { in: [...LIVE_RUN_STATUSES] } },
      data: { status: LiveRunStatus.STOPPING, activeKey: null },
    });
    return result.count;
  }

  countRunningRuns(): Promise<number> {
    return this.prisma.liveProcessingRun.count({
      where: { status: { in: [LiveRunStatus.ACTIVE, LiveRunStatus.DELAYED] } },
    });
  }

  async providerCostSince(since: Date): Promise<number> {
    const result = await this.prisma.liveProviderCost.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { costMicroUsd: true },
    });
    return Number(result._sum.costMicroUsd ?? 0n);
  }

  /**
   * Atomically claims one run whose lease expired (or never existed): bumps its
   * generation (the fencing token) and takes the lease. SKIP LOCKED lets replicas
   * claim concurrently without blocking each other.
   */
  async claimNext(owner: string): Promise<ClaimedRunRow | null> {
    const rows = await this.prisma.$queryRaw<ClaimedRunRow[]>`
      UPDATE live_processing_runs
         SET generation = generation + 1,
             lease_owner = ${owner},
             lease_expires_at = now() + make_interval(secs => ${RUN_LEASE_SECONDS}),
             updated_at = now()
       WHERE id = (
         SELECT id FROM live_processing_runs
          WHERE status::text IN ('PENDING', 'ACTIVE', 'DELAYED', 'STOPPING')
            AND (lease_expires_at IS NULL OR lease_expires_at < now())
          ORDER BY created_at
          FOR UPDATE SKIP LOCKED
          LIMIT 1)
      RETURNING id, generation`;
    return rows[0] ?? null;
  }

  /** Lets another replica take this replica's runs at once (shutdown). */
  async releaseLeases(owner: string): Promise<void> {
    await this.prisma.liveProcessingRun.updateMany({
      where: { leaseOwner: owner },
      data: { leaseExpiresAt: new Date(0) },
    });
  }

  findRunWithStream(runId: string): Promise<(LiveProcessingRun & { stream: LiveStream }) | null> {
    return this.prisma.liveProcessingRun.findUnique({
      where: { id: runId },
      include: { stream: true },
    });
  }
}
