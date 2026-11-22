import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern, type LiveRunEndedPayload } from '@claw/shared-types';

import type { LiveRunEndReason } from '../../../common/enums/live-run-end-reason.enum';
import { LiveStatusCode } from '../../../common/enums/live-status-code.enum';
import { LiveStreamEventType } from '../../../common/enums/live-stream-event-type.enum';
import { LiveRunStatus } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { LiveStreamEvent } from '../../realtime/types/live-stream-event.types';
import { FencedRunWriter } from '../services/fenced-run-writer.service';
import { RunEventEmitter } from '../services/run-event-emitter.service';
import type { WorkerContext } from '../types/processing.types';

/**
 * Run status transitions a worker makes (fenced) and the `live.run_ended` announcement:
 * ids, timings and totals only — never transcript, summary or stream URL.
 */
@Injectable()
export class RunLifecycleManager {
  private readonly logger = new Logger(RunLifecycleManager.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly writer: FencedRunWriter,
    private readonly events: RunEventEmitter,
    private readonly rabbit: RabbitMQService,
  ) {}

  /** PENDING → ACTIVE on first claim (a resumed ACTIVE/DELAYED run keeps its status). */
  async activate(context: WorkerContext): Promise<void> {
    await this.writer.commit(context.lease, async (tx) => {
      await tx.liveProcessingRun.updateMany({
        where: { id: context.lease.runId, status: LiveRunStatus.PENDING },
        data: { status: LiveRunStatus.ACTIVE },
      });
    });
  }

  async setStatus(
    context: WorkerContext,
    status: LiveRunStatus,
    code: LiveStatusCode,
  ): Promise<void> {
    await this.writer.commit(context.lease, async (tx) => {
      await tx.liveProcessingRun.update({ where: { id: context.lease.runId }, data: { status } });
    });
    await this.events.emit([this.statusEvent(context, code)]);
  }

  /** Terminal transition (STOPPED/ENDED/FAILED): frees activeKey and the lease, then announces. */
  async finish(
    context: WorkerContext,
    status: LiveRunStatus,
    reason: LiveRunEndReason,
    processedMs: number,
  ): Promise<void> {
    const endedAt = new Date();
    await this.writer.commit(context.lease, async (tx) => {
      await tx.liveProcessingRun.update({
        where: { id: context.lease.runId },
        data: {
          status,
          activeKey: null,
          endedAt,
          leaseOwner: null,
          failureCode: status === LiveRunStatus.FAILED ? reason : null,
        },
      });
    });
    if (status === LiveRunStatus.ENDED)
      await this.events.emit([this.statusEvent(context, LiveStatusCode.ENDED)]);
    await this.announce(context, reason, endedAt, processedMs);
  }

  private async announce(
    context: WorkerContext,
    reason: LiveRunEndReason,
    endedAt: Date,
    processedMs: number,
  ): Promise<void> {
    try {
      const runId = context.lease.runId;
      const [cost, viewers] = await Promise.all([
        this.prisma.liveProviderCost.aggregate({ where: { runId }, _sum: { costMicroUsd: true } }),
        this.prisma.liveViewerSession.findMany({
          where: { runId },
          select: { userId: true },
          distinct: ['userId'],
        }),
      ]);
      const payload: LiveRunEndedPayload = {
        runId,
        sourceId: context.streamId,
        reason,
        startedAt: context.startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        analysedSeconds: Math.round(processedMs / 1000),
        providerCostMicroUsd: Number(cost._sum.costMicroUsd ?? 0n),
        viewerCount: viewers.length,
        timestamp: new Date().toISOString(),
      };
      await this.rabbit.publish(EventPattern.LIVE_RUN_ENDED, payload);
    } catch {
      this.logger.warn(`live.run_ended for run ${context.lease.runId} not published`);
    }
  }

  private statusEvent(context: WorkerContext, status: LiveStatusCode): LiveStreamEvent {
    return {
      type: LiveStreamEventType.STATUS,
      runId: context.lease.runId,
      startAt: Date.now(),
      status,
      data: {},
    };
  }
}
