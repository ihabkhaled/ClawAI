import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { ThreadGenerationJob } from '../../../generated/prisma';
import {
  EventPattern,
  type ThreadGenerationCompletedPayload,
  type ThreadGenerationRequestedPayload,
} from '@claw/shared-types';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { z } from 'zod';

import { ChatSnapshotClient } from '../../source-snapshots/chat-snapshot.client';
import { GenerationPipelineManager } from '../managers/generation-pipeline.manager';
import { GenerationJobsRepository } from '../repositories/generation-jobs.repository';
import { type EnqueueGenerationDto, enqueueGenerationSchema } from '../dto/enqueue-generation.dto';
import {
  type EnqueueRevisionReviewDto,
  type RevisionReviewJobRequest,
  revisionReviewJobRequestSchema,
} from '../dto/enqueue-revision-review.dto';
import { ThreadBudgetClient } from './thread-budget.client';
import { StepRecorder } from './step-recorder.service';
import type { RetryGenerationDto } from '../dto/retry-generation.dto';
import { buildRetryInput } from '../utilities/build-retry-input.utility';
import { isDeterministicGenerationError } from '../utilities/deterministic-generation.error';
import { parseStepError } from '../utilities/parse-step-error.utility';
import {
  RETRY_ALREADY_EXISTS_MESSAGE,
  RETRY_CHAIN_MAX_DEPTH,
  STEP_CANCELLED_CODE,
  STEP_FINAL_STAGE,
  STEP_GENERATION_FAILED_CODE,
  STEP_LEASE_EXPIRED_CODE,
} from '../constants/step-recorder.constants';
import { ThreadGenerationCancelledError } from '../utilities/thread-generation-cancelled.error';
import { ThreadGenerationLeaseLostError } from '../utilities/thread-generation-lease-lost.error';
import {
  type GenerationPipelineResult,
  type OwnerRevisionContent,
  ownerRevisionContentSchema,
  type PrivateGenerationState,
} from '../types/generation-pipeline.types';
import type {
  GenerationEnqueueResult,
  GenerationJobDispatchView,
  GenerationJobOwnerState,
  GenerationJobRow,
  GenerationJobStorageResponse,
  LeaseMonitor,
} from '../types/generation-job-storage.types';
import { stableJson } from '../utilities/stable-json.utility';
import { describeFailure } from '../utilities/describe-failure.utility';
import { toFailedPayload } from '../utilities/failure-report.utility';

import {
  CANCEL_POLL_INTERVAL_MS,
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
    private readonly recorder: StepRecorder,
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
    return this.enqueueWithSnapshot(input, async () => {
      const snapshot = await this.snapshots.getOwnedSnapshot(input.ownerId, input.sourceThreadId);
      return {
        snapshot: JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>,
        sha256: snapshot.sha256,
      };
    });
  }

  /** Owner retry: a new job from the failed job's pinned snapshot, with allowed overrides. */
  async retry(
    jobId: string,
    change: RetryGenerationDto,
  ): Promise<{ jobId: string; status: string }> {
    const source = await this.repository.findRetrySource(jobId, change.ownerId);
    if (!source) throw new NotFoundException('Generation job not found');
    if (source.status !== 'FAILED' && source.status !== 'CANCELLED') {
      throw new ConflictException('Only a failed or cancelled generation can be retried');
    }
    const original = enqueueGenerationSchema.safeParse(source.request);
    if (!original.success) throw new ConflictException('This generation cannot be retried');
    const input = buildRetryInput(original.data, change);
    const snapshot = z.record(z.string(), z.unknown()).safeParse(source.sourceSnapshot);
    if (!snapshot.success) throw new BadRequestException('Saved source snapshot is invalid');
    return this.enqueueWithSnapshot(
      input,
      () => Promise.resolve({ snapshot: snapshot.data, sha256: source.sourceSnapshotHash }),
      source.id,
    );
  }

  /** Owner delete of a finished job. The budget close stays on its own idempotent path. */
  async deleteJob(jobId: string, ownerId: string): Promise<{ jobId: string; deleted: true }> {
    const job = await this.repository.findDeletable(jobId, ownerId);
    if (!job) throw new NotFoundException('Generation job not found');
    const chain = [job];
    const seen = new Set([job.id]);
    let parentId = job.retriedFromJobId;
    // A retry chain is one history to the owner: delete the job and every earlier attempt.
    while (parentId && !seen.has(parentId) && chain.length < RETRY_CHAIN_MAX_DEPTH) {
      const parent = await this.repository.findDeletable(parentId, ownerId);
      if (!parent) break;
      seen.add(parent.id);
      chain.push(parent);
      parentId = parent.retriedFromJobId;
    }
    if (chain.some((item) => item.status === 'QUEUED' || item.status === 'RUNNING')) {
      throw new ConflictException('A running generation must be cancelled before it is deleted');
    }
    if (chain.some((item) => item.budgetClosedAt === null)) {
      throw new ConflictException('The generation budget is still closing; try again shortly');
    }
    if (
      !(await this.repository.deleteTerminalChain(
        chain.map((item) => item.id),
        ownerId,
      ))
    ) {
      throw new ConflictException('The generation changed while it was being deleted');
    }
    return { jobId, deleted: true };
  }

  private async enqueueWithSnapshot(
    input: EnqueueGenerationDto,
    loadSnapshot: () => Promise<{ snapshot: Record<string, unknown>; sha256: string }>,
    retriedFromJobId?: string,
  ): Promise<GenerationEnqueueResult> {
    const replay = await this.replayIdempotentEnqueue(input);
    if (replay) return replay;
    const retryChild = await this.findExistingRetryChild(retriedFromJobId);
    if (retryChild) return retryChild;
    const { snapshot, sha256 } = await loadSnapshot();
    const budget = await this.budgets.reserve(
      input.ownerId,
      input.idempotencyKey,
      Number(input.spendCapMicroUsd),
    );
    const stored = await this.repository.createQueued(
      input,
      snapshot,
      sha256,
      budget.id,
      retriedFromJobId,
    );
    return this.dispatchQueuedJob(await this.requireStoredJob(stored, budget.id));
  }

  private async replayIdempotentEnqueue(
    input: EnqueueGenerationDto,
  ): Promise<GenerationEnqueueResult | null> {
    const existing = await this.repository.findByIdempotencyKey(input);
    if (!existing) return null;
    if (existing.result === GenerationJobStorageResult.CONFLICT) {
      throw new ConflictException('Idempotency key was already used for a different generation');
    }
    return this.dispatchQueuedJob(existing.job);
  }

  private async requireStoredJob(
    stored: GenerationJobStorageResponse,
    budgetId: string,
  ): Promise<GenerationJobRow> {
    switch (stored.result) {
      case GenerationJobStorageResult.RETRY_CONFLICT:
        // Lost the race to a concurrent retry: give the reserved budget back.
        await this.releaseUnusedBudget(budgetId);
        throw new ConflictException(RETRY_ALREADY_EXISTS_MESSAGE);
      case GenerationJobStorageResult.CONFLICT:
        throw new ConflictException('Idempotency key was already used for a different generation');
      case GenerationJobStorageResult.STORAGE_ERROR:
        throw new InternalServerErrorException('Generation job could not be stored');
      case GenerationJobStorageResult.ACCOUNT_DELETED:
        throw new ConflictException('Deleted accounts cannot enqueue Threads generation');
      case GenerationJobStorageResult.SUCCESS:
        return stored.job;
    }
  }

  private async dispatchQueuedJob(
    job: GenerationJobDispatchView,
  ): Promise<GenerationEnqueueResult> {
    if (job.status === 'QUEUED') await this.dispatchJob(job.id, job.correlationId);
    return { jobId: job.id, status: job.status };
  }

  async enqueueRevisionReview(input: EnqueueRevisionReviewDto): Promise<GenerationEnqueueResult> {
    const existing = await this.repository.findRevisionReviewByIdempotencyKey(input);
    if (existing) {
      if (existing.result === GenerationJobStorageResult.CONFLICT) {
        throw new ConflictException('Idempotency key was already used for a different edit review');
      }
      return this.dispatchQueuedJob(existing.job);
    }

    await this.requireRevisionParent(input);
    const budget = await this.budgets.reserve(
      input.ownerId,
      input.idempotencyKey,
      Number(input.spendCapMicroUsd),
    );
    const stored = await this.repository.createRevisionReviewQueued(input, budget.id);
    return this.dispatchQueuedJob(await this.requireStoredRevisionJob(stored, budget.id));
  }

  private async requireRevisionParent(input: EnqueueRevisionReviewDto): Promise<void> {
    const parent = await this.repository.findRevisionParent(input.parentJobId, input.ownerId);
    const parentRequest = parent ? enqueueGenerationSchema.safeParse(parent.request) : null;
    if (
      !parent ||
      !parentRequest?.success ||
      !parent.evidenceBundle ||
      !parent.evidenceBundleHash
    ) {
      throw new NotFoundException('Parent generation review not found');
    }
  }

  private async requireStoredRevisionJob(
    stored: GenerationJobStorageResponse,
    budgetId: string,
  ): Promise<GenerationJobRow> {
    switch (stored.result) {
      case GenerationJobStorageResult.RETRY_CONFLICT:
      case GenerationJobStorageResult.CONFLICT:
        throw new ConflictException('Idempotency key was already used for a different edit review');
      case GenerationJobStorageResult.STORAGE_ERROR:
        await this.budgets.close(budgetId, GenerationBudgetCloseStatus.RELEASED);
        throw new InternalServerErrorException('Revision review job could not be stored');
      case GenerationJobStorageResult.ACCOUNT_DELETED:
        throw new ConflictException('Deleted accounts cannot request a Threads revision');
      case GenerationJobStorageResult.SUCCESS:
        return stored.job;
    }
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
    const content = this.readOwnerRevision(job);
    return {
      jobId: job.id,
      status: job.status,
      stage: job.stage,
      round: job.round,
      safeErrorCode: job.safeErrorCode,
      review: content?.review ?? null,
      draft: content
        ? {
            markdown: content.markdown,
            citations: content.citations,
            judgeScore: content.judge.score,
            criticScore: content.critic.score,
          }
        : null,
    };
  }

  private readOwnerRevision(job: GenerationJobOwnerState): OwnerRevisionContent | null {
    const revision = job.status === 'WAITING_FOR_REVIEW' ? job.revisions[0] : undefined;
    if (!revision) return null;
    const parsed = ownerRevisionContentSchema.safeParse(revision.content);
    if (!parsed.success) {
      throw new InternalServerErrorException('Generation result is invalid');
    }
    return parsed.data;
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
    const revisionReview = revisionReviewJobRequestSchema.safeParse(job.request);
    const request = revisionReview.success
      ? revisionReview.data
      : enqueueGenerationSchema.parse(job.request);
    const lease = this.startLeaseMonitor(job);
    try {
      await this.runAndSave(job, event, request, lease, revisionReview.success);
    } catch (error: unknown) {
      await this.handleAttemptError(job, error, lease);
    } finally {
      lease.stop();
    }
  }

  /**
   * Watches one running job: renews its lease, and looks for a cancel request every
   * CANCEL_POLL_INTERVAL_MS. Cancel or lease loss aborts `signal`, which stops the model call
   * in flight instead of leaving the worker to wait for it to finish on its own.
   */
  private startLeaseMonitor(job: ThreadGenerationJob): LeaseMonitor {
    let leaseLost = false;
    const stopper = new AbortController();
    const abort = (): void => {
      if (!stopper.signal.aborted) stopper.abort(new ThreadGenerationCancelledError());
    };
    const lose = (): void => {
      leaseLost = true;
      abort();
    };
    const heartbeat = this.startHeartbeat(job, lose);
    const cancelPoll = this.startCancelPoll(job, abort);
    return {
      signal: stopper.signal,
      isLost: () => leaseLost,
      markLost: lose,
      stop: () => {
        clearInterval(heartbeat);
        clearInterval(cancelPoll);
      },
    };
  }

  private startHeartbeat(job: ThreadGenerationJob, onLost: () => void): NodeJS.Timeout {
    let heartbeatRunning = false;
    const heartbeat = setInterval(() => {
      if (heartbeatRunning) return;
      heartbeatRunning = true;
      void this.repository
        .heartbeat(job.id, GENERATION_WORKER_ID, job.attemptCount)
        .then((owned) => {
          if (!owned) onLost();
        })
        .catch(() => {
          this.logger.warn('Generation worker heartbeat failed');
        })
        .finally(() => {
          heartbeatRunning = false;
        });
    }, GENERATION_HEARTBEAT_MS);
    heartbeat.unref();
    return heartbeat;
  }

  private startCancelPoll(job: ThreadGenerationJob, onCancel: () => void): NodeJS.Timeout {
    let pollRunning = false;
    const poll = setInterval(() => {
      if (pollRunning) return;
      pollRunning = true;
      void this.repository
        .isCancellationRequested(job.id)
        .then((requested) => {
          if (requested) onCancel();
        })
        .catch(() => {
          this.logger.warn('Generation cancel check failed');
        })
        .finally(() => {
          pollRunning = false;
        });
    }, CANCEL_POLL_INTERVAL_MS);
    poll.unref();
    return poll;
  }

  private async runAndSave(
    job: ThreadGenerationJob,
    event: z.infer<typeof generationEventSchema>,
    request: EnqueueGenerationDto | RevisionReviewJobRequest,
    lease: LeaseMonitor,
    isRevisionReview: boolean,
  ): Promise<void> {
    const result = await this.runPipeline(job, event, request, lease);
    if (lease.isLost()) return;
    if (await this.repository.isCancellationRequested(job.id)) {
      throw new ThreadGenerationCancelledError();
    }
    const saved = await this.repository.saveResult(job.id, job.attemptCount, result);
    if (!saved) {
      lease.markLost();
      return;
    }
    await this.closeBudget(job.id, job.budgetId, GenerationBudgetCloseStatus.FINALIZED);
    await this.repository.completeAttempt(job.id, job.attemptCount);
    await this.recorder.record(job.id, {
      stage: 'READY_FOR_REVIEW',
      round: result.rounds,
      outcome: 'SUCCEEDED',
      roleKind: 'SYSTEM',
    });
    // A revision review is an edit the owner already asked for and is waiting on in the page.
    if (!isRevisionReview) await this.announceCompleted(job);
  }

  private async handleAttemptError(
    job: ThreadGenerationJob,
    error: unknown,
    lease: LeaseMonitor,
  ): Promise<void> {
    if (lease.isLost()) {
      this.logger.warn('Expired generation worker stopped after lease loss');
      return;
    }
    if (error instanceof ThreadGenerationLeaseLostError) return;
    if (error instanceof ThreadGenerationCancelledError) {
      await this.handleCancelledAttempt(job);
      return;
    }
    await this.handleFailedAttempt(job, error);
  }

  private async handleCancelledAttempt(job: ThreadGenerationJob): Promise<void> {
    const outcome = await this.repository.retryOrFail(job.id, job.attemptCount);
    if (outcome === GenerationJobRecoveryOutcome.CANCELLED) {
      await this.closeBudget(job.id, job.budgetId, GenerationBudgetCloseStatus.RELEASED);
    }
    await this.recorder.record(job.id, {
      stage: STEP_FINAL_STAGE,
      outcome: 'FAILED',
      roleKind: 'SYSTEM',
      code: STEP_CANCELLED_CODE,
    });
  }

  private async handleFailedAttempt(job: ThreadGenerationJob, error: unknown): Promise<void> {
    // Operators need the failing step; never log prompts, drafts or provider bodies.
    this.logger.warn(`Generation attempt failed: ${describeFailure(error)}`);
    // A failure a retry cannot fix (prompt too large, bad role config, catalog 4xx) ends the job now.
    const outcome = await this.repository.retryOrFail(
      job.id,
      job.attemptCount,
      describeFailure(error),
      !isDeterministicGenerationError(error),
    );
    if (outcome === GenerationJobRecoveryOutcome.FAILED) {
      await this.closeBudget(job.id, job.budgetId, GenerationBudgetCloseStatus.RELEASED);
    } else if (outcome === GenerationJobRecoveryOutcome.RETRY) {
      this.logger.warn('Generation attempt scheduled for bounded retry');
    }
    if (
      outcome === GenerationJobRecoveryOutcome.FAILED ||
      outcome === GenerationJobRecoveryOutcome.RETRY
    ) {
      const parsedError = parseStepError(error, STEP_GENERATION_FAILED_CODE);
      await this.recorder.record(job.id, {
        stage: STEP_FINAL_STAGE,
        outcome: outcome === GenerationJobRecoveryOutcome.FAILED ? 'FAILED' : 'RETRY',
        roleKind: 'SYSTEM',
        code: parsedError.code,
        httpStatus: parsedError.httpStatus,
      });
    }
  }

  /** Best effort: the owner is told the draft is ready; a lost message never fails the job. */
  private async announceCompleted(job: {
    id: string;
    ownerId: string;
    correlationId: string;
  }): Promise<void> {
    const payload: ThreadGenerationCompletedPayload = {
      jobId: job.id,
      correlationId: job.correlationId,
      ownerId: job.ownerId,
    };
    try {
      await this.rabbit.publishConfirmed(EventPattern.THREAD_GENERATION_COMPLETED, payload);
    } catch {
      this.logger.warn('Generation completed notice could not be published');
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
        await this.recordRecovery(job.jobId, job.outcome);
      }
      const pendingClosures = await this.repository.findPendingBudgetClosures(10);
      for (const job of pendingClosures) {
        const status =
          job.status === 'WAITING_FOR_REVIEW'
            ? GenerationBudgetCloseStatus.FINALIZED
            : GenerationBudgetCloseStatus.RELEASED;
        await this.closeBudget(job.id, job.budgetId, status);
      }
      await this.reportFailedJobs();
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

  /** Publishes one operator report per FAILED job; the marker makes a retry safe. */
  private async reportFailedJobs(): Promise<void> {
    for (const job of await this.repository.findUnreportedFailures(10)) {
      try {
        await this.rabbit.publishConfirmed(
          EventPattern.THREAD_GENERATION_FAILED,
          toFailedPayload(job),
        );
        await this.repository.markFailureReported(job.id);
      } catch {
        this.logger.warn('Generation failure report is pending retry by the recovery scheduler');
        return;
      }
    }
  }

  /**
   * A retry child may exist without the threads-service ever attaching it. Returning it keeps
   * retry idempotent and re-attachable instead of blocking forever. The source job was already
   * owner-checked by the caller, so its only child belongs to the same owner.
   */
  private async findExistingRetryChild(
    retriedFromJobId: string | undefined,
  ): Promise<{ jobId: string; status: string } | null> {
    if (!retriedFromJobId) return null;
    const child = await this.repository.findRetryChild(retriedFromJobId);
    return child ? { jobId: child.id, status: child.status } : null;
  }

  /** Tells the owner why a job restarted or stopped after its worker vanished. */
  private async recordRecovery(
    jobId: string,
    outcome: GenerationJobRecoveryOutcome,
  ): Promise<void> {
    const cancelled = outcome === GenerationJobRecoveryOutcome.CANCELLED;
    await this.recorder.record(jobId, {
      stage: STEP_FINAL_STAGE,
      outcome: outcome === GenerationJobRecoveryOutcome.RETRY ? 'RETRY' : 'FAILED',
      roleKind: 'SYSTEM',
      code: cancelled ? STEP_CANCELLED_CODE : STEP_LEASE_EXPIRED_CODE,
    });
  }

  /** Gives back a reservation that no job will ever use. The close call is idempotent. */
  private async releaseUnusedBudget(budgetId: string): Promise<void> {
    try {
      await this.budgets.close(budgetId, GenerationBudgetCloseStatus.RELEASED);
    } catch {
      this.logger.error('Unused generation budget release failed');
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

  private async runPipeline(
    job: ThreadGenerationJob,
    event: z.infer<typeof generationEventSchema>,
    request: EnqueueGenerationDto | RevisionReviewJobRequest,
    lease: LeaseMonitor,
  ): Promise<GenerationPipelineResult> {
    const source = z.record(z.string(), z.unknown()).parse(job.sourceSnapshot);
    const pipelineInput = {
      jobId: job.id,
      ownerId: job.ownerId,
      budgetId: job.budgetId,
      attempt: job.attemptCount,
      correlationId: event.correlationId,
      contentLocale: request.contentLocale,
      sourceSnapshot: source,
      authors: request.authors,
      judge: request.judge,
      critic: request.critic,
      isCancellationRequested: async () =>
        lease.isLost() || (await this.repository.isCancellationRequested(job.id)),
      signal: lease.signal,
    };
    if ('kind' in request) {
      const evidence = this.requireIntactEvidence(job);
      return this.pipeline.reviewRevision(
        {
          ...pipelineInput,
          topic: request.topic,
          publicationType: request.publicationType,
        },
        request.draft,
        evidence.bundle,
        evidence.hash,
      );
    }
    return this.pipeline.generate({
      ...pipelineInput,
      topic: request.topic,
      publicationType: request.publicationType,
    });
  }

  private requireIntactEvidence(job: ThreadGenerationJob): {
    bundle: Record<string, unknown>;
    hash: string;
  } {
    const evidence = z.record(z.string(), z.unknown()).safeParse(job.evidenceBundle);
    if (
      !evidence.success ||
      !job.evidenceBundleHash ||
      (this.hash(JSON.stringify(evidence.data)) !== job.evidenceBundleHash &&
        this.hash(stableJson(evidence.data)) !== job.evidenceBundleHash)
    ) {
      throw new InternalServerErrorException('Saved research evidence failed integrity validation');
    }
    return { bundle: evidence.data, hash: job.evidenceBundleHash };
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
