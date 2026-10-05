import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { EventPattern, type ThreadGenerationRequestedPayload } from '@claw/shared-types';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { z } from 'zod';

import { ChatSnapshotClient } from '../../source-snapshots/chat-snapshot.client';
import { GenerationPipelineManager } from '../managers/generation-pipeline.manager';
import { GenerationJobsRepository } from '../repositories/generation-jobs.repository';
import { type EnqueueGenerationDto, enqueueGenerationSchema } from '../dto/enqueue-generation.dto';
import { ThreadBudgetClient } from './thread-budget.client';
import { ThreadGenerationCancelledError } from '../utilities/thread-generation-cancelled.error';
import { ThreadGenerationLeaseLostError } from '../utilities/thread-generation-lease-lost.error';
import type { PrivateGenerationState } from '../types/generation-pipeline.types';

import {
  GENERATION_HEARTBEAT_MS,
  GENERATION_RECOVERY_INTERVAL_MS,
  GENERATION_WORKER_ID,
  generationEventSchema,
} from '../constants/generation.constants';
import { GenerationJobStorageResult } from '../../../common/enums/generation-job-storage-result.enum';
import { GenerationBudgetCloseStatus } from '../../../common/enums/generation-budget-close-status.enum';
import { GenerationJobRecoveryOutcome } from '../../../common/enums/generation-job-recovery-outcome.enum';

@Injectable()
export class GenerationJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GenerationJobsService.name);
  private recoveryTimer: ReturnType<typeof setInterval> | undefined;
  private recoveryRunning = false;
  constructor(
    private readonly snapshots: ChatSnapshotClient,
    private readonly repository: GenerationJobsRepository,
    private readonly rabbit: RabbitMQService,
    private readonly pipeline: GenerationPipelineManager,
    private readonly budgets: ThreadBudgetClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.subscribe();
    this.recoveryTimer = setInterval(
      () => void this.reconcileQueue(),
      GENERATION_RECOVERY_INTERVAL_MS,
    );
    this.recoveryTimer.unref();
    await this.reconcileQueue();
  }

  onModuleDestroy(): void {
    if (this.recoveryTimer) clearInterval(this.recoveryTimer);
  }

  async enqueue(input: EnqueueGenerationDto): Promise<{ jobId: string; status: string }> {
    const existing = await this.repository.findByIdempotencyKey(input);
    if (existing) {
      switch (existing.result) {
        case GenerationJobStorageResult.CONFLICT:
          throw new ConflictException(
            'Idempotency key was already used for a different generation',
          );
        case GenerationJobStorageResult.SUCCESS:
          if (existing.job.status === 'QUEUED') {
            await this.dispatchJob(existing.job.id, existing.job.correlationId);
          }
          return { jobId: existing.job.id, status: existing.job.status };
      }
    }
    const snapshot = await this.snapshots.getOwnedSnapshot(input.ownerId, input.sourceThreadId);
    const budget = await this.budgets.reserve(
      input.ownerId,
      input.idempotencyKey,
      Number(input.spendCapMicroUsd),
    );
    const stored = await this.repository.createQueued(
      input,
      JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>,
      snapshot.sha256,
      budget.id,
    );
    switch (stored.result) {
      case GenerationJobStorageResult.CONFLICT:
        throw new ConflictException('Idempotency key was already used for a different generation');
      case GenerationJobStorageResult.STORAGE_ERROR:
        throw new InternalServerErrorException('Generation job could not be stored');
      case GenerationJobStorageResult.SUCCESS:
        break;
    }
    const job = stored.job;
    if (job.status === 'QUEUED') await this.dispatchJob(job.id, job.correlationId);
    return { jobId: job.id, status: job.status };
  }

  async cancel(jobId: string): Promise<{ jobId: string; status: string }> {
    const result = await this.repository.requestCancellation(jobId);
    if (!result) return { jobId, status: 'NOT_FOUND' };
    if (result.queued && result.budgetId) {
      await this.closeBudget(jobId, result.budgetId, GenerationBudgetCloseStatus.RELEASED);
    }
    return { jobId, status: result.status };
  }

  async getOwnerState(jobId: string, ownerId: string): Promise<PrivateGenerationState> {
    const job = await this.repository.findOwnerState(jobId, ownerId);
    if (!job) throw new NotFoundException('Generation job not found');
    const revision = job.status === 'WAITING_FOR_REVIEW' ? job.revisions[0] : undefined;
    const parsed = revision
      ? z
          .object({
            markdown: z.string(),
            citations: z.array(z.object({ evidenceId: z.string(), url: z.string().url() })),
            judge: z.object({ score: z.number().int().min(0).max(100) }),
            critic: z.object({ score: z.number().int().min(0).max(100) }),
          })
          .safeParse(revision.content)
      : undefined;
    if (parsed && !parsed.success) {
      throw new InternalServerErrorException('Generation result is invalid');
    }
    return {
      jobId: job.id,
      status: job.status,
      stage: job.stage,
      round: job.round,
      safeErrorCode: job.safeErrorCode,
      draft: parsed?.success
        ? {
            markdown: parsed.data.markdown,
            citations: parsed.data.citations,
            judgeScore: parsed.data.judge.score,
            criticScore: parsed.data.critic.score,
          }
        : null,
    };
  }

  async subscribe(): Promise<void> {
    await this.rabbit.subscribe(EventPattern.THREAD_GENERATION_REQUESTED, (raw) =>
      this.process(raw),
    );
  }

  private async process(raw: unknown): Promise<void> {
    const event = generationEventSchema.parse(raw);
    const job = await this.repository.claim(event.jobId, GENERATION_WORKER_ID);
    if (!job) return;
    const request = enqueueGenerationSchema.parse(job.request);
    let leaseLost = false;
    let heartbeatRunning = false;
    const heartbeat = setInterval(() => {
      if (heartbeatRunning) return;
      heartbeatRunning = true;
      void this.repository
        .heartbeat(job.id, GENERATION_WORKER_ID, job.attemptCount)
        .then((owned) => {
          if (!owned) leaseLost = true;
        })
        .catch(() => {
          this.logger.warn('Generation worker heartbeat failed');
        })
        .finally(() => {
          heartbeatRunning = false;
        });
    }, GENERATION_HEARTBEAT_MS);
    heartbeat.unref();
    try {
      const source = z.record(z.string(), z.unknown()).parse(job.sourceSnapshot);
      const result = await this.pipeline.generate({
        jobId: job.id,
        ownerId: job.ownerId,
        budgetId: job.budgetId,
        attempt: job.attemptCount,
        correlationId: event.correlationId,
        topic: request.topic,
        publicationType: request.publicationType,
        sourceSnapshot: source,
        authors: request.authors,
        judge: request.judge,
        critic: request.critic,
        isCancellationRequested: async () =>
          leaseLost || (await this.repository.isCancellationRequested(job.id)),
      });
      if (leaseLost) return;
      if (await this.repository.isCancellationRequested(job.id)) {
        throw new ThreadGenerationCancelledError();
      }
      const saved = await this.repository.saveResult(job.id, job.attemptCount, result);
      if (!saved) {
        leaseLost = true;
        return;
      }
      await this.closeBudget(job.id, job.budgetId, GenerationBudgetCloseStatus.FINALIZED);
      await this.repository.completeAttempt(job.id, job.attemptCount);
    } catch (error: unknown) {
      if (leaseLost) {
        this.logger.warn('Expired generation worker stopped after lease loss');
        return;
      }
      if (error instanceof ThreadGenerationLeaseLostError) return;
      if (error instanceof ThreadGenerationCancelledError) {
        const outcome = await this.repository.retryOrFail(job.id, job.attemptCount);
        if (outcome === GenerationJobRecoveryOutcome.CANCELLED) {
          await this.closeBudget(job.id, job.budgetId, GenerationBudgetCloseStatus.RELEASED);
        }
        return;
      }
      const outcome = await this.repository.retryOrFail(job.id, job.attemptCount);
      if (outcome === GenerationJobRecoveryOutcome.FAILED) {
        await this.closeBudget(job.id, job.budgetId, GenerationBudgetCloseStatus.RELEASED);
      } else if (outcome === GenerationJobRecoveryOutcome.RETRY) {
        this.logger.warn('Generation attempt scheduled for bounded retry');
      }
    } finally {
      clearInterval(heartbeat);
    }
  }

  private async dispatchJob(jobId: string, correlationId: string): Promise<void> {
    if (!(await this.repository.leaseDispatch(jobId))) return;
    try {
      const payload: ThreadGenerationRequestedPayload = {
        jobId,
        correlationId,
        requestedAt: new Date().toISOString(),
      };
      await this.rabbit.publishConfirmed(EventPattern.THREAD_GENERATION_REQUESTED, payload);
    } catch {
      await this.repository.clearDispatchLease(jobId);
      this.logger.warn('Generation dispatch is pending retry by the recovery scheduler');
    }
  }

  private async reconcileQueue(): Promise<void> {
    if (this.recoveryRunning) return;
    this.recoveryRunning = true;
    try {
      const recovered = await this.repository.recoverExpiredLeases();
      for (const job of recovered) {
        if (job.outcome !== GenerationJobRecoveryOutcome.RETRY) {
          await this.closeBudget(job.jobId, job.budgetId, GenerationBudgetCloseStatus.RELEASED);
        }
      }
      const pendingClosures = await this.repository.findPendingBudgetClosures(10);
      for (const job of pendingClosures) {
        const status =
          job.status === 'WAITING_FOR_REVIEW'
            ? GenerationBudgetCloseStatus.FINALIZED
            : GenerationBudgetCloseStatus.RELEASED;
        await this.closeBudget(job.id, job.budgetId, status);
      }
      const queued = await this.repository.findDispatchable(10);
      for (const job of queued) {
        const record = await this.repository.findQueued(job.id);
        if (record) await this.dispatchJob(job.id, record.correlationId);
      }
    } catch {
      this.logger.warn('Generation recovery pass failed; it will retry on the next interval');
    } finally {
      this.recoveryRunning = false;
    }
  }

  private async closeBudget(
    jobId: string,
    budgetId: string,
    status: GenerationBudgetCloseStatus,
  ): Promise<void> {
    try {
      await this.budgets.close(budgetId, status);
      await this.repository.markBudgetClosed(jobId, status);
    } catch {
      this.logger.error(`Generation budget close failed (${status})`);
    }
  }
}
