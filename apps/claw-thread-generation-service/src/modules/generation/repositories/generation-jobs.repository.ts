import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma, ThreadGenerationStage, ThreadGenerationStatus } from '../../../generated/prisma';
import { z } from 'zod';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type EnqueueGenerationDto, enqueueGenerationSchema } from '../dto/enqueue-generation.dto';
import type { EnqueueRevisionReviewDto } from '../dto/enqueue-revision-review.dto';
import type { GenerationPipelineResult } from '../types/generation-pipeline.types';
import type { ChatModelResponse } from '../../models/chat-model.client';
import { stableJson } from '../utilities/stable-json.utility';
import { GenerationJobStorageResult } from '../../../common/enums/generation-job-storage-result.enum';
import type {
  GenerationBudgetCloseFailureState,
  GenerationCancellationState,
  GenerationJobBudgetClosure,
  GenerationJobDeletable,
  GenerationJobDispatchable,
  GenerationJobIdempotencyResponse,
  GenerationJobOwnerState,
  GenerationJobProgressRow,
  GenerationJobRetrySource,
  GenerationJobRevisionParent,
  GenerationJobRow,
  GenerationJobStorageResponse,
  GenerationJobUnreportedFailure,
  GenerationResumeState,
  GenerationStaleJob,
} from '../types/generation-job-storage.types';
import {
  BUDGET_CLOSURE_SELECT,
  DELETABLE_SELECT,
  OWNER_STATE_SELECT,
  PROGRESS_JOB_SELECT,
  RETRY_SOURCE_SELECT,
  REVISION_PARENT_SELECT,
  UNREPORTED_FAILURE_SELECT,
} from '../constants/generation-job-select.constants';
import { GenerationBudgetCloseStatus } from '../../../common/enums/generation-budget-close-status.enum';
import { GenerationJobAttemptOutcome } from '../../../common/enums/generation-job-attempt-outcome.enum';
import { GenerationJobRecoveryOutcome } from '../../../common/enums/generation-job-recovery-outcome.enum';
import {
  BUDGET_CLOSE_ABANDONED_STATUS,
  BUDGET_CLOSE_MAX_ATTEMPTS,
  budgetCloseDelayMs,
  GENERATION_DISPATCH_LEASE_MS,
  GENERATION_LEASE_MS,
  GENERATION_OWNER_MAX_RUNNING,
  GENERATION_QUEUE_MAX_AGE_MS,
  GENERATION_STALE_BATCH,
  GENERATION_STALE_GRACE_MS,
  GENERATION_WORKER_SLOT_IDS,
  generationRetryDelayMs,
  MAX_GENERATION_ATTEMPTS,
} from '../constants/generation.constants';
import {
  STEP_LEASE_EXPIRED_CODE,
  STEP_QUEUE_EXPIRED_CODE,
} from '../constants/step-recorder.constants';

@Injectable()
export class GenerationJobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdempotencyKey(
    input: EnqueueGenerationDto,
  ): Promise<GenerationJobIdempotencyResponse | null> {
    const existing = await this.prisma.threadGenerationJob.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true, ownerId: true, request: true, status: true, correlationId: true },
    });
    if (!existing) return null;
    return existing.ownerId === input.ownerId && stableJson(existing.request) === stableJson(input)
      ? { result: GenerationJobStorageResult.SUCCESS, job: existing }
      : { result: GenerationJobStorageResult.CONFLICT };
  }

  async createQueued(
    input: EnqueueGenerationDto,
    sourceSnapshot: Record<string, unknown>,
    hash: string,
    budgetId: string,
    retriedFromJobId?: string,
  ): Promise<GenerationJobStorageResponse> {
    if (await this.isAccountDeleted(input.ownerId)) {
      return { result: GenerationJobStorageResult.ACCOUNT_DELETED };
    }
    const existing = await this.prisma.threadGenerationJob.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      return existing.ownerId !== input.ownerId ||
        stableJson(existing.request) !== stableJson(input)
        ? { result: GenerationJobStorageResult.CONFLICT }
        : { result: GenerationJobStorageResult.SUCCESS, job: existing };
    }
    try {
      const created = await this.prisma.$transaction(
        async (transaction) => {
          const deleted = await transaction.threadDeletedAccount.findUnique({
            where: { accountHash: this.hashUserId(input.ownerId) },
            select: { accountHash: true },
          });
          if (deleted) return { accountDeleted: true as const };
          const job = await transaction.threadGenerationJob.create({
            data: {
              ownerId: input.ownerId,
              sourceThreadId: input.sourceThreadId,
              idempotencyKey: input.idempotencyKey,
              correlationId: input.correlationId,
              sourceSnapshot: sourceSnapshot as Prisma.InputJsonValue,
              sourceSnapshotHash: hash,
              request: JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue,
              budgetId,
              spendCapMicroUsd: BigInt(input.spendCapMicroUsd),
              publicIntentVersion: input.publicIntentVersion,
              publicIntentAt: new Date(),
              retriedFromJobId: retriedFromJobId ?? null,
            },
          });
          return { accountDeleted: false as const, job };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      if (created.accountDeleted) return { result: GenerationJobStorageResult.ACCOUNT_DELETED };
      const { job } = created;
      return { result: GenerationJobStorageResult.SUCCESS, job };
    } catch (error: unknown) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        return { result: GenerationJobStorageResult.STORAGE_ERROR };
      }
      const raced = await this.prisma.threadGenerationJob.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (raced?.ownerId === input.ownerId && stableJson(raced.request) === stableJson(input)) {
        return { result: GenerationJobStorageResult.SUCCESS, job: raced };
      }
      // No job holds this idempotency key, so the unique hit was the retry link.
      return !raced && retriedFromJobId
        ? { result: GenerationJobStorageResult.RETRY_CONFLICT }
        : { result: GenerationJobStorageResult.CONFLICT };
    }
  }

  /** The retry already created from this job, if any. */
  async findRetryChild(retriedFromJobId: string): Promise<{ id: string; status: string } | null> {
    return this.prisma.threadGenerationJob.findUnique({
      where: { retriedFromJobId },
      select: { id: true, status: true },
    });
  }

  private async isAccountDeleted(userId: string): Promise<boolean> {
    const tombstone = await this.prisma.threadDeletedAccount.findUnique({
      where: { accountHash: this.hashUserId(userId) },
      select: { accountHash: true },
    });
    return tombstone !== null;
  }

  async findRevisionReviewByIdempotencyKey(
    input: EnqueueRevisionReviewDto,
  ): Promise<GenerationJobIdempotencyResponse | null> {
    const existing = await this.prisma.threadGenerationJob.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true, ownerId: true, request: true, status: true, correlationId: true },
    });
    if (!existing) return null;
    const expected = { kind: 'revision-review', ...input };
    return existing.ownerId === input.ownerId &&
      stableJson(this.revisionRequestForIdempotency(existing.request)) === stableJson(expected)
      ? { result: GenerationJobStorageResult.SUCCESS, job: existing }
      : { result: GenerationJobStorageResult.CONFLICT };
  }

  async findRevisionParent(
    parentJobId: string,
    ownerId: string,
  ): Promise<GenerationJobRevisionParent | null> {
    return this.prisma.threadGenerationJob.findFirst({
      where: {
        id: parentJobId,
        ownerId,
        status: ThreadGenerationStatus.WAITING_FOR_REVIEW,
      },
      select: REVISION_PARENT_SELECT,
    });
  }

  async createRevisionReviewQueued(
    input: EnqueueRevisionReviewDto,
    budgetId: string,
  ): Promise<GenerationJobStorageResponse> {
    if (await this.isAccountDeleted(input.ownerId)) {
      return { result: GenerationJobStorageResult.ACCOUNT_DELETED };
    }
    const parent = await this.findRevisionParent(input.parentJobId, input.ownerId);
    if (!parent?.evidenceBundleHash || parent.evidenceBundle === null) {
      return { result: GenerationJobStorageResult.STORAGE_ERROR };
    }
    const originalRequest = enqueueGenerationSchema.safeParse(parent.request);
    if (!originalRequest.success) return { result: GenerationJobStorageResult.STORAGE_ERROR };
    const request = {
      kind: 'revision-review' as const,
      ...input,
      topic: originalRequest.data.topic,
      publicationType: originalRequest.data.publicationType,
      contentLocale: originalRequest.data.contentLocale,
      authors: originalRequest.data.authors,
      judge: originalRequest.data.judge,
      critic: originalRequest.data.critic,
    };
    const existing = await this.prisma.threadGenerationJob.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      return existing.ownerId !== input.ownerId ||
        stableJson(this.revisionRequestForIdempotency(existing.request)) !==
          stableJson(this.revisionRequestForIdempotency(request))
        ? { result: GenerationJobStorageResult.CONFLICT }
        : { result: GenerationJobStorageResult.SUCCESS, job: existing };
    }
    try {
      const created = await this.prisma.$transaction(
        async (transaction) => {
          const deleted = await transaction.threadDeletedAccount.findUnique({
            where: { accountHash: this.hashUserId(input.ownerId) },
            select: { accountHash: true },
          });
          if (deleted) return { accountDeleted: true as const };
          const job = await transaction.threadGenerationJob.create({
            data: {
              ownerId: input.ownerId,
              sourceThreadId: parent.sourceThreadId,
              idempotencyKey: input.idempotencyKey,
              correlationId: input.correlationId,
              sourceSnapshot: parent.sourceSnapshot as Prisma.InputJsonValue,
              sourceSnapshotHash: parent.sourceSnapshotHash,
              evidenceBundle: parent.evidenceBundle as Prisma.InputJsonValue,
              evidenceBundleHash: parent.evidenceBundleHash,
              evidenceVersion: parent.evidenceVersion,
              request: JSON.parse(JSON.stringify(request)) as Prisma.InputJsonValue,
              budgetId,
              spendCapMicroUsd: BigInt(input.spendCapMicroUsd),
              publicIntentVersion: parent.publicIntentVersion,
              publicIntentAt: parent.publicIntentAt,
            },
          });
          return { accountDeleted: false as const, job };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      if (created.accountDeleted) return { result: GenerationJobStorageResult.ACCOUNT_DELETED };
      const { job } = created;
      return { result: GenerationJobStorageResult.SUCCESS, job };
    } catch (error: unknown) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        return { result: GenerationJobStorageResult.STORAGE_ERROR };
      }
      const raced = await this.prisma.threadGenerationJob.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      return raced?.ownerId === input.ownerId &&
        stableJson(this.revisionRequestForIdempotency(raced.request)) ===
          stableJson(this.revisionRequestForIdempotency(request))
        ? { result: GenerationJobStorageResult.SUCCESS, job: raced }
        : { result: GenerationJobStorageResult.CONFLICT };
    }
  }

  async findQueued(id: string): Promise<GenerationJobRow | null> {
    return this.prisma.threadGenerationJob.findFirst({
      where: { id, status: ThreadGenerationStatus.QUEUED },
    });
  }

  async findOwnerState(id: string, ownerId: string): Promise<GenerationJobOwnerState | null> {
    return this.prisma.threadGenerationJob.findFirst({
      where: { id, ownerId },
      select: OWNER_STATE_SELECT,
    });
  }

  async findProgressJob(id: string, ownerId: string): Promise<GenerationJobProgressRow | null> {
    return this.prisma.threadGenerationJob.findFirst({
      where: { id, ownerId },
      select: PROGRESS_JOB_SELECT,
    });
  }

  async findRetrySource(id: string, ownerId: string): Promise<GenerationJobRetrySource | null> {
    return this.prisma.threadGenerationJob.findFirst({
      where: { id, ownerId },
      select: RETRY_SOURCE_SELECT,
    });
  }

  async findDeletable(id: string, ownerId: string): Promise<GenerationJobDeletable | null> {
    return this.prisma.threadGenerationJob.findFirst({
      where: { id, ownerId },
      select: DELETABLE_SELECT,
    });
  }

  /**
   * Deletes the job and every retry ancestor in one transaction, or none of them.
   * Cascades to attempts, checkpoints, communications, drafts and steps.
   */
  async deleteTerminalChain(ids: string[], ownerId: string): Promise<boolean> {
    const where: Prisma.ThreadGenerationJobWhereInput = {
      id: { in: ids },
      ownerId,
      budgetClosedAt: { not: null },
      status: {
        in: [
          ThreadGenerationStatus.FAILED,
          ThreadGenerationStatus.CANCELLED,
          ThreadGenerationStatus.WAITING_FOR_REVIEW,
          ThreadGenerationStatus.COMPLETED,
        ],
      },
    };
    return this.prisma.$transaction(
      async (tx) => {
        // All or nothing: one job that no longer qualifies leaves the whole chain in place.
        if ((await tx.threadGenerationJob.count({ where })) !== ids.length) return false;
        const result = await tx.threadGenerationJob.deleteMany({ where });
        return result.count === ids.length;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async leaseDispatch(jobId: string): Promise<boolean> {
    const now = new Date();
    const result = await this.prisma.threadGenerationJob.updateMany({
      where: {
        id: jobId,
        status: ThreadGenerationStatus.QUEUED,
        nextAttemptAt: { lte: now },
        OR: [{ dispatchLeaseExpiresAt: null }, { dispatchLeaseExpiresAt: { lte: now } }],
      },
      data: { dispatchLeaseExpiresAt: new Date(now.getTime() + GENERATION_DISPATCH_LEASE_MS) },
    });
    return result.count === 1;
  }

  async clearDispatchLease(jobId: string): Promise<void> {
    await this.prisma.threadGenerationJob.updateMany({
      where: { id: jobId, status: ThreadGenerationStatus.QUEUED },
      data: { dispatchLeaseExpiresAt: null },
    });
  }

  /**
   * Queued jobs that may be published now, one per owner per round (oldest first within an owner),
   * so a user with a long backlog cannot fill the batch and starve everyone behind them. An owner
   * already at the running cap is skipped: its next job would only be deferred again.
   */
  async findDispatchable(limit: number): Promise<GenerationJobDispatchable[]> {
    // An ISO string cast to timestamp keeps the UTC clock Prisma stores, whatever the session zone.
    const nowText = new Date().toISOString();
    return this.prisma.$queryRaw<GenerationJobDispatchable[]>(Prisma.sql`
      SELECT ranked."id" FROM (
        SELECT j."id", j."next_attempt_at", j."created_at",
          ROW_NUMBER() OVER (
            PARTITION BY j."owner_id" ORDER BY j."next_attempt_at", j."created_at", j."id"
          ) AS owner_rank
        FROM "thread_generation_jobs" j
        WHERE j."status" = 'QUEUED'
          AND j."next_attempt_at" <= CAST(${nowText} AS timestamp)
          AND (
            j."dispatch_lease_expires_at" IS NULL
            OR j."dispatch_lease_expires_at" <= CAST(${nowText} AS timestamp)
          )
          AND (
            SELECT COUNT(*) FROM "thread_generation_jobs" r
            WHERE r."owner_id" = j."owner_id" AND r."status" = 'RUNNING'
          ) < ${GENERATION_OWNER_MAX_RUNNING}
      ) ranked
      ORDER BY ranked.owner_rank, ranked."next_attempt_at", ranked."created_at", ranked."id"
      LIMIT ${limit}
    `);
  }

  /** Terminal jobs whose budget is still open and whose back-off has passed, oldest first. */
  async findPendingBudgetClosures(limit: number): Promise<GenerationJobBudgetClosure[]> {
    const now = new Date();
    return this.prisma.threadGenerationJob.findMany({
      where: {
        budgetClosedAt: null,
        status: {
          in: [
            ThreadGenerationStatus.WAITING_FOR_REVIEW,
            ThreadGenerationStatus.FAILED,
            ThreadGenerationStatus.CANCELLED,
          ],
        },
        OR: [{ budgetCloseNextAt: null }, { budgetCloseNextAt: { lte: now } }],
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: BUDGET_CLOSURE_SELECT,
    });
  }

  /**
   * Counts one failed budget close and schedules the next try with exponential back-off. At the
   * limit the close is given up: the job is marked closed with an abandoned status so the sweep
   * stops, the owner can delete the job, and the caller logs the single terminal line.
   */
  async recordBudgetCloseFailure(jobId: string): Promise<GenerationBudgetCloseFailureState | null> {
    const job = await this.prisma.threadGenerationJob.findFirst({
      where: { id: jobId, budgetClosedAt: null },
      select: { budgetCloseAttempts: true },
    });
    if (!job) return null;
    const attempts = job.budgetCloseAttempts + 1;
    const now = new Date();
    const abandoned = attempts >= BUDGET_CLOSE_MAX_ATTEMPTS;
    const updated = await this.prisma.threadGenerationJob.updateMany({
      where: { id: jobId, budgetClosedAt: null, budgetCloseAttempts: job.budgetCloseAttempts },
      data: abandoned
        ? {
            budgetCloseAttempts: attempts,
            budgetCloseStatus: BUDGET_CLOSE_ABANDONED_STATUS,
            budgetClosedAt: now,
            budgetCloseNextAt: null,
          }
        : {
            budgetCloseAttempts: attempts,
            budgetCloseNextAt: new Date(now.getTime() + budgetCloseDelayMs(attempts)),
          },
    });
    // Another replica counted the same failure first: it owns the log line.
    return updated.count === 1 ? { attempts, abandoned } : null;
  }

  /** Failed jobs not yet reported to operators, oldest first. */
  async findUnreportedFailures(limit: number): Promise<GenerationJobUnreportedFailure[]> {
    return this.prisma.threadGenerationJob.findMany({
      where: { status: ThreadGenerationStatus.FAILED, failureReportedAt: null },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: UNREPORTED_FAILURE_SELECT,
    });
  }

  async markFailureReported(jobId: string): Promise<void> {
    await this.prisma.threadGenerationJob.updateMany({
      where: { id: jobId, failureReportedAt: null },
      data: { failureReportedAt: new Date() },
    });
  }

  async markBudgetClosed(jobId: string, status: GenerationBudgetCloseStatus): Promise<void> {
    await this.prisma.threadGenerationJob.updateMany({
      where: { id: jobId, budgetClosedAt: null },
      data: { budgetCloseStatus: status, budgetClosedAt: new Date() },
    });
  }

  async loadResumeState(jobId: string): Promise<GenerationResumeState> {
    const [job, communications] = await this.prisma.$transaction([
      this.prisma.threadGenerationJob.findUnique({
        where: { id: jobId },
        select: { evidenceBundle: true, evidenceBundleHash: true },
      }),
      this.prisma.threadModelCommunication.findMany({
        where: { jobId },
        orderBy: [{ round: 'asc' }, { createdAt: 'asc' }],
        select: { role: true, round: true, evidenceBundleHash: true, output: true },
      }),
    ]);
    return {
      evidenceBundle: job?.evidenceBundle,
      evidenceBundleHash: job?.evidenceBundleHash,
      communications,
    };
  }

  async requestCancellation(jobId: string): Promise<GenerationCancellationState | null> {
    const queued = await this.prisma.threadGenerationJob.updateMany({
      where: { id: jobId, status: ThreadGenerationStatus.QUEUED },
      data: {
        status: ThreadGenerationStatus.CANCELLED,
        cancelRequestedAt: new Date(),
        completedAt: new Date(),
      },
    });
    if (queued.count === 1) {
      const job = await this.prisma.threadGenerationJob.findUnique({ where: { id: jobId } });
      return job
        ? { status: job.status, queued: true, budgetId: job.budgetId }
        : { status: ThreadGenerationStatus.CANCELLED, queued: true };
    }
    await this.prisma.threadGenerationJob.updateMany({
      where: { id: jobId, status: ThreadGenerationStatus.RUNNING, cancelRequestedAt: null },
      data: { cancelRequestedAt: new Date() },
    });
    const job = await this.prisma.threadGenerationJob.findUnique({ where: { id: jobId } });
    return job ? { status: job.status, queued: false, budgetId: job.budgetId } : null;
  }

  async isCancellationRequested(jobId: string): Promise<boolean> {
    const job = await this.prisma.threadGenerationJob.findUnique({
      where: { id: jobId },
      select: { cancelRequestedAt: true },
    });
    return job !== null && job.cancelRequestedAt !== null;
  }

  async saveResearchEvidence(
    jobId: string,
    attempt: number,
    evidence: {
      researchRunId: string;
      bundle: Record<string, unknown>;
      sha256: string;
      version: 1;
    },
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const saved = await tx.threadGenerationJob.updateMany({
        where: { id: jobId, status: ThreadGenerationStatus.RUNNING, attemptCount: attempt },
        data: {
          stage: ThreadGenerationStage.AUTHOR_DRAFTS,
          evidenceBundle: evidence.bundle as Prisma.InputJsonValue,
          evidenceBundleHash: evidence.sha256,
          evidenceVersion: evidence.version,
        },
      });
      if (saved.count !== 1) return false;
      await tx.threadGenerationCheckpoint.create({
        data: {
          jobId,
          stage: ThreadGenerationStage.RESEARCH,
          round: 0,
          data: { researchRunId: evidence.researchRunId, evidenceHash: evidence.sha256 },
          dataHash: evidence.sha256,
        },
      });
      return true;
    });
  }

  /**
   * Records which stage and round the running attempt is in, so the owner can follow it.
   * Fenced on the attempt number like every other write: a superseded worker changes nothing.
   */
  async saveProgress(
    jobId: string,
    attempt: number,
    stage: ThreadGenerationStage,
    round: number,
  ): Promise<void> {
    await this.prisma.threadGenerationJob.updateMany({
      where: { id: jobId, status: ThreadGenerationStatus.RUNNING, attemptCount: attempt },
      data: { stage, round },
    });
  }

  /**
   * Adds the settled cost of one model call (integer micro-USD) to the job. Deliberately not
   * fenced on the attempt or status: the provider was paid even when the worker lost its lease
   * or the job was cancelled mid-call, and the owner's total must say so.
   */
  async addSpend(jobId: string, microUsd: number): Promise<void> {
    if (!Number.isSafeInteger(microUsd) || microUsd <= 0) return;
    await this.prisma.threadGenerationJob.updateMany({
      where: { id: jobId },
      data: { spentMicroCredits: { increment: BigInt(microUsd) } },
    });
  }

  /**
   * Raises the job's persisted spend to the budget row's settled total. Monotonic (never lowers
   * it) and not fenced on status or attempt, for the same reason as addSpend.
   */
  async syncSpend(jobId: string, settledMicroUsd: number): Promise<void> {
    if (!Number.isSafeInteger(settledMicroUsd) || settledMicroUsd <= 0) return;
    await this.prisma.threadGenerationJob.updateMany({
      where: { id: jobId, spentMicroCredits: { lt: BigInt(settledMicroUsd) } },
      data: { spentMicroCredits: BigInt(settledMicroUsd) },
    });
  }

  async saveCommunication(input: {
    jobId: string;
    attempt: number;
    role: string;
    round: number;
    inputHash: string;
    evidenceHash: string;
    response: ChatModelResponse;
    output: Record<string, unknown>;
  }): Promise<boolean> {
    const output = JSON.parse(JSON.stringify(input.output)) as Prisma.InputJsonValue;
    const usage: Prisma.InputJsonValue = {
      inputTokens: input.response.inputTokens ?? null,
      outputTokens: input.response.outputTokens ?? null,
      durationMs: input.response.durationMs,
    };
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.threadGenerationJob.findFirst({
        where: {
          id: input.jobId,
          status: ThreadGenerationStatus.RUNNING,
          attemptCount: input.attempt,
        },
        select: { id: true },
      });
      if (!job) return false;
      await tx.threadModelCommunication.upsert({
        where: { jobId_role_round: { jobId: input.jobId, role: input.role, round: input.round } },
        create: {
          jobId: input.jobId,
          role: input.role,
          round: input.round,
          modelKey: input.response.model,
          providerKey: input.response.provider,
          inputHash: input.inputHash,
          evidenceBundleHash: input.evidenceHash,
          output,
          outputHash: createHash('sha256').update(JSON.stringify(input.output)).digest('hex'),
          usage,
        },
        update: {},
      });
      return true;
    });
  }

  async findCommunication(
    jobId: string,
    role: string,
    round: number,
    evidenceHash: string,
    inputHash: string,
  ): Promise<Prisma.JsonValue | null> {
    const communication = await this.prisma.threadModelCommunication.findUnique({
      where: { jobId_role_round: { jobId, role, round } },
      select: { evidenceBundleHash: true, inputHash: true, output: true },
    });
    return communication?.evidenceBundleHash === evidenceHash &&
      communication.inputHash === inputHash
      ? communication.output
      : null;
  }

  /**
   * Takes a QUEUED job for this worker, or returns null and leaves it queued untouched when it
   * is not runnable, its owner already runs GENERATION_OWNER_MAX_RUNNING jobs, or no worker slot
   * is free. Null is never an error: the message is acked and the recovery sweep re-publishes the
   * job once its dispatch lease lapses, so a deferred job is delayed, not lost.
   */
  async claim(id: string, workerId: string): Promise<GenerationJobRow | null> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.threadGenerationJob.findFirst({
        where: {
          id,
          status: ThreadGenerationStatus.QUEUED,
          nextAttemptAt: { lte: now },
          attemptCount: { lt: MAX_GENERATION_ATTEMPTS },
        },
        select: { ownerId: true },
      });
      if (!candidate) return null;
      // One claim per owner at a time, so two replicas cannot both pass the running-count check.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${candidate.ownerId}))`;
      const running = await tx.threadGenerationJob.count({
        where: { ownerId: candidate.ownerId, status: ThreadGenerationStatus.RUNNING },
      });
      if (running >= GENERATION_OWNER_MAX_RUNNING) return null;
      const claimed = await tx.threadGenerationJob.updateMany({
        where: {
          id,
          status: ThreadGenerationStatus.QUEUED,
          attemptCount: { lt: MAX_GENERATION_ATTEMPTS },
        },
        data: {
          status: ThreadGenerationStatus.RUNNING,
          attemptCount: { increment: 1 },
          leaseOwner: workerId,
          leaseExpiresAt: new Date(now.getTime() + GENERATION_LEASE_MS),
          dispatchLeaseExpiresAt: null,
        },
      });
      if (claimed.count !== 1) return null;
      if (!(await this.claimWorkerSlot(tx, id, workerId, now))) {
        await tx.threadGenerationJob.updateMany({
          where: { id, status: ThreadGenerationStatus.RUNNING, leaseOwner: workerId },
          data: {
            status: ThreadGenerationStatus.QUEUED,
            attemptCount: { decrement: 1 },
            leaseOwner: null,
            leaseExpiresAt: null,
          },
        });
        return null;
      }
      const job = await tx.threadGenerationJob.findUnique({ where: { id } });
      if (!job) return null;
      if (job.evidenceBundle === null) {
        await tx.threadGenerationJob.updateMany({
          where: { id, status: ThreadGenerationStatus.RUNNING, attemptCount: job.attemptCount },
          data: { stage: ThreadGenerationStage.RESEARCH },
        });
      }
      await tx.threadGenerationAttempt.create({
        data: { jobId: id, attempt: job.attemptCount, workerId },
      });
      return job;
    });
  }

  private async claimWorkerSlot(
    tx: Prisma.TransactionClient,
    jobId: string,
    workerId: string,
    now: Date,
  ): Promise<boolean> {
    for (const slotId of GENERATION_WORKER_SLOT_IDS) {
      const slot = await tx.threadGenerationWorkerSlot.updateMany({
        where: { slotId, OR: [{ jobId: null }, { leaseExpiresAt: { lte: now } }] },
        data: {
          jobId,
          workerId,
          leaseExpiresAt: new Date(now.getTime() + GENERATION_LEASE_MS),
          heartbeatAt: now,
        },
      });
      if (slot.count === 1) return true;
    }
    return false;
  }

  async heartbeat(jobId: string, workerId: string, attempt: number): Promise<boolean> {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + GENERATION_LEASE_MS);
    const updated = await this.prisma.threadGenerationJob.updateMany({
      where: {
        id: jobId,
        status: ThreadGenerationStatus.RUNNING,
        leaseOwner: workerId,
        attemptCount: attempt,
      },
      data: { leaseExpiresAt },
    });
    if (updated.count !== 1) return false;
    await this.prisma.$transaction([
      this.prisma.threadGenerationAttempt.updateMany({
        where: { jobId, attempt, workerId, finishedAt: null },
        data: { heartbeatAt: now },
      }),
      this.prisma.threadGenerationWorkerSlot.updateMany({
        where: { jobId, workerId },
        data: { leaseExpiresAt, heartbeatAt: now },
      }),
    ]);
    return true;
  }

  async retryOrFail(
    jobId: string,
    attempt: number,
    failureSummary: string | null = null,
    retryable = true,
  ): Promise<GenerationJobRecoveryOutcome> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.threadGenerationJob.findFirst({
        where: { id: jobId, status: ThreadGenerationStatus.RUNNING, attemptCount: attempt },
        select: { cancelRequestedAt: true },
      });
      if (!job) return GenerationJobRecoveryOutcome.MISSING;
      const cancelled = job.cancelRequestedAt !== null;
      const retry = retryable && !cancelled && attempt < MAX_GENERATION_ATTEMPTS;
      let outcome = GenerationJobRecoveryOutcome.FAILED;
      let jobUpdate: Prisma.ThreadGenerationJobUpdateManyMutationInput;
      let attemptOutcome = GenerationJobAttemptOutcome.FAILED;
      let safeErrorCode: string | null = 'GENERATION_FAILED';
      if (cancelled) {
        outcome = GenerationJobRecoveryOutcome.CANCELLED;
        attemptOutcome = GenerationJobAttemptOutcome.CANCELLED;
        safeErrorCode = null;
        jobUpdate = {
          status: ThreadGenerationStatus.CANCELLED,
          completedAt: now,
          leaseOwner: null,
          leaseExpiresAt: null,
        };
      } else if (retry) {
        outcome = GenerationJobRecoveryOutcome.RETRY;
        attemptOutcome = GenerationJobAttemptOutcome.RETRY;
        safeErrorCode = 'GENERATION_ATTEMPT_RETRY';
        jobUpdate = {
          status: ThreadGenerationStatus.QUEUED,
          safeErrorCode,
          nextAttemptAt: new Date(now.getTime() + generationRetryDelayMs(attempt)),
          dispatchLeaseExpiresAt: null,
          leaseOwner: null,
          leaseExpiresAt: null,
        };
      } else {
        jobUpdate = {
          status: ThreadGenerationStatus.FAILED,
          safeErrorCode,
          failureSummary: failureSummary?.slice(0, 400) ?? null,
          completedAt: now,
          leaseOwner: null,
          leaseExpiresAt: null,
        };
      }
      await tx.threadGenerationJob.updateMany({
        where: { id: jobId, status: ThreadGenerationStatus.RUNNING, attemptCount: attempt },
        data: jobUpdate,
      });
      await tx.threadGenerationAttempt.updateMany({
        where: { jobId, attempt, finishedAt: null },
        data: {
          finishedAt: now,
          outcome: attemptOutcome,
          safeErrorCode,
        },
      });
      await this.releaseWorkerSlot(tx, jobId);
      return outcome;
    });
  }

  async recoverExpiredLeases(): Promise<
    Array<{ jobId: string; budgetId: string; outcome: GenerationJobRecoveryOutcome }>
  > {
    const now = new Date();
    const abandoned = this.abandonedLeaseWhere(now);
    return this.prisma.$transaction(async (tx) => {
      const stale = await tx.threadGenerationJob.findMany({
        where: { status: ThreadGenerationStatus.RUNNING, ...abandoned },
        select: { id: true, budgetId: true, attemptCount: true, cancelRequestedAt: true },
        orderBy: [{ leaseExpiresAt: 'asc' }, { createdAt: 'asc' }],
        take: GENERATION_WORKER_SLOT_IDS.length,
      });
      const recovered: Array<{
        jobId: string;
        budgetId: string;
        outcome: GenerationJobRecoveryOutcome;
      }> = [];
      for (const job of stale) {
        const cancelled = job.cancelRequestedAt !== null;
        const retry = !cancelled && job.attemptCount < MAX_GENERATION_ATTEMPTS;
        let outcome = GenerationJobRecoveryOutcome.FAILED;
        let attemptOutcome = GenerationJobAttemptOutcome.FAILED;
        let attemptSafeErrorCode: string | null = 'GENERATION_FAILED';
        let jobUpdate: Prisma.ThreadGenerationJobUpdateManyMutationInput;
        if (cancelled) {
          outcome = GenerationJobRecoveryOutcome.CANCELLED;
          attemptOutcome = GenerationJobAttemptOutcome.CANCELLED;
          attemptSafeErrorCode = null;
          jobUpdate = {
            status: ThreadGenerationStatus.CANCELLED,
            completedAt: now,
            leaseOwner: null,
            leaseExpiresAt: null,
          };
        } else if (retry) {
          outcome = GenerationJobRecoveryOutcome.RETRY;
          attemptOutcome = GenerationJobAttemptOutcome.WORKER_LOST;
          attemptSafeErrorCode = 'GENERATION_WORKER_LOST';
          jobUpdate = {
            status: ThreadGenerationStatus.QUEUED,
            safeErrorCode: 'GENERATION_WORKER_LOST',
            nextAttemptAt: new Date(now.getTime() + generationRetryDelayMs(job.attemptCount)),
            dispatchLeaseExpiresAt: null,
            leaseOwner: null,
            leaseExpiresAt: null,
          };
        } else {
          jobUpdate = {
            status: ThreadGenerationStatus.FAILED,
            safeErrorCode: 'GENERATION_FAILED',
            failureSummary: STEP_LEASE_EXPIRED_CODE,
            completedAt: now,
            leaseOwner: null,
            leaseExpiresAt: null,
          };
        }
        const recoveredCount = await tx.threadGenerationJob.updateMany({
          where: { id: job.id, status: ThreadGenerationStatus.RUNNING, ...abandoned },
          data: jobUpdate,
        });
        if (recoveredCount.count !== 1) continue;
        await tx.threadGenerationAttempt.updateMany({
          where: { jobId: job.id, attempt: job.attemptCount, finishedAt: null },
          data: {
            finishedAt: now,
            outcome: attemptOutcome,
            safeErrorCode: attemptSafeErrorCode,
          },
        });
        await this.releaseWorkerSlot(tx, job.id);
        recovered.push({ jobId: job.id, budgetId: job.budgetId, outcome });
      }
      return recovered;
    });
  }

  /**
   * A RUNNING job whose lease ran out, or one with no lease at all (no owner) that nothing has
   * touched for a lease plus the grace period (no heartbeat). Both are abandoned by their worker.
   */
  private abandonedLeaseWhere(now: Date): Prisma.ThreadGenerationJobWhereInput {
    const untouchedSince = new Date(
      now.getTime() - GENERATION_LEASE_MS - GENERATION_STALE_GRACE_MS,
    );
    return {
      OR: [
        { leaseExpiresAt: { lte: now } },
        { leaseExpiresAt: null, updatedAt: { lte: untouchedSince } },
      ],
    };
  }

  /**
   * Fails jobs that sat QUEUED longer than GENERATION_QUEUE_MAX_AGE_MS (an orphan whose
   * publication was never attached, or a queue that stopped draining). Each row is guarded by
   * its status and age, so a job claimed meanwhile is left alone and a repeat pass changes nothing.
   */
  async expireStaleQueuedJobs(): Promise<GenerationStaleJob[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - GENERATION_QUEUE_MAX_AGE_MS);
    const where = { status: ThreadGenerationStatus.QUEUED, nextAttemptAt: { lte: cutoff } };
    return this.prisma.$transaction(async (tx) => {
      const stale = await tx.threadGenerationJob.findMany({
        where,
        select: { id: true, budgetId: true },
        orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }],
        take: GENERATION_STALE_BATCH,
      });
      const expired: GenerationStaleJob[] = [];
      for (const job of stale) {
        const changed = await tx.threadGenerationJob.updateMany({
          where: { ...where, id: job.id },
          data: {
            status: ThreadGenerationStatus.FAILED,
            safeErrorCode: 'GENERATION_FAILED',
            failureSummary: STEP_QUEUE_EXPIRED_CODE,
            dispatchLeaseExpiresAt: null,
            completedAt: now,
          },
        });
        if (changed.count === 1) expired.push({ jobId: job.id, budgetId: job.budgetId });
      }
      return expired;
    });
  }

  async saveResult(
    jobId: string,
    attempt: number,
    result: GenerationPipelineResult,
  ): Promise<boolean> {
    const evidence = result.evidenceBundle as Prisma.InputJsonValue;
    const revision = {
      markdown: result.markdown,
      citations: result.citations,
      judge: result.judgeReview,
      critic: result.criticReview,
      review: {
        draftHash: result.draftHash,
        authorConsensus: result.authorConsensus,
        ready: result.reviewReady,
        reasons: result.reviewReasons,
      },
    } as Prisma.InputJsonValue;
    return this.prisma.$transaction(async (tx) => {
      const saved = await tx.threadGenerationJob.updateMany({
        where: { id: jobId, status: ThreadGenerationStatus.RUNNING, attemptCount: attempt },
        data: {
          status: ThreadGenerationStatus.WAITING_FOR_REVIEW,
          stage: ThreadGenerationStage.READY_FOR_REVIEW,
          evidenceBundle: evidence,
          evidenceBundleHash: result.evidenceHash,
          evidenceVersion: 1,
          round: result.rounds,
          leaseOwner: null,
          leaseExpiresAt: null,
          completedAt: new Date(),
        },
      });
      if (saved.count !== 1) return false;
      await tx.threadRevisionDraft.create({
        data: {
          jobId,
          revision: 1,
          round: result.rounds,
          content: revision,
          contentHash: result.draftHash,
        },
      });
      await tx.threadGenerationCheckpoint.create({
        data: {
          jobId,
          stage: ThreadGenerationStage.READY_FOR_REVIEW,
          round: result.rounds,
          data: { revision: 1, draftHash: result.draftHash },
          dataHash: result.draftHash,
        },
      });
      await this.releaseWorkerSlot(tx, jobId);
      return true;
    });
  }

  async fail(jobId: string, attempt: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.threadGenerationJob.updateMany({
        where: { id: jobId, status: ThreadGenerationStatus.RUNNING },
        data: {
          status: ThreadGenerationStatus.FAILED,
          safeErrorCode: 'GENERATION_FAILED',
          leaseOwner: null,
          leaseExpiresAt: null,
          completedAt: new Date(),
        },
      });
      await tx.threadGenerationAttempt.updateMany({
        where: { jobId, attempt, finishedAt: null },
        data: { finishedAt: new Date(), outcome: 'FAILED', safeErrorCode: 'GENERATION_FAILED' },
      });
      await this.releaseWorkerSlot(tx, jobId);
    });
  }

  async completeAttempt(jobId: string, attempt: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.threadGenerationAttempt.updateMany({
        where: { jobId, attempt, finishedAt: null },
        data: { finishedAt: new Date(), outcome: 'WAITING_FOR_REVIEW' },
      });
      await this.releaseWorkerSlot(tx, jobId);
    });
  }

  private async releaseWorkerSlot(tx: Prisma.TransactionClient, jobId: string): Promise<void> {
    await tx.threadGenerationWorkerSlot.updateMany({
      where: { jobId },
      data: { jobId: null, workerId: null, leaseExpiresAt: null, heartbeatAt: null },
    });
  }

  private revisionRequestForIdempotency(value: unknown): Record<string, unknown> {
    const parsed = z.record(z.string(), z.unknown()).safeParse(value);
    if (!parsed.success) return {};
    return {
      kind: parsed.data['kind'],
      ownerId: parsed.data['ownerId'],
      parentJobId: parsed.data['parentJobId'],
      idempotencyKey: parsed.data['idempotencyKey'],
      correlationId: parsed.data['correlationId'],
      spendCapMicroUsd: parsed.data['spendCapMicroUsd'],
      draft: parsed.data['draft'],
    };
  }

  private hashUserId(userId: string): string {
    return createHash('sha256').update(userId).digest('hex');
  }
}
