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
  GenerationJobIdempotencyResponse,
  GenerationJobStorageResponse,
} from '../types/generation-job-storage.types';
import { GenerationBudgetCloseStatus } from '../../../common/enums/generation-budget-close-status.enum';
import { GenerationJobAttemptOutcome } from '../../../common/enums/generation-job-attempt-outcome.enum';
import { GenerationJobRecoveryOutcome } from '../../../common/enums/generation-job-recovery-outcome.enum';
import {
  GENERATION_DISPATCH_LEASE_MS,
  GENERATION_LEASE_MS,
  GENERATION_WORKER_SLOT_IDS,
  generationRetryDelayMs,
  MAX_GENERATION_ATTEMPTS,
} from '../constants/generation.constants';

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
  ): Promise<GenerationJobStorageResponse> {
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
      const job = await this.prisma.threadGenerationJob.create({
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
        },
      });
      return { result: GenerationJobStorageResult.SUCCESS, job };
    } catch (error: unknown) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        return { result: GenerationJobStorageResult.STORAGE_ERROR };
      }
      const raced = await this.prisma.threadGenerationJob.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      return raced &&
        raced.ownerId === input.ownerId &&
        stableJson(raced.request) === stableJson(input)
        ? { result: GenerationJobStorageResult.SUCCESS, job: raced }
        : { result: GenerationJobStorageResult.CONFLICT };
    }
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

  async findRevisionParent(parentJobId: string, ownerId: string) {
    return this.prisma.threadGenerationJob.findFirst({
      where: {
        id: parentJobId,
        ownerId,
        status: ThreadGenerationStatus.WAITING_FOR_REVIEW,
      },
      select: {
        id: true,
        ownerId: true,
        sourceThreadId: true,
        sourceSnapshot: true,
        sourceSnapshotHash: true,
        evidenceBundle: true,
        evidenceBundleHash: true,
        evidenceVersion: true,
        request: true,
        publicIntentVersion: true,
        publicIntentAt: true,
      },
    });
  }

  async createRevisionReviewQueued(
    input: EnqueueRevisionReviewDto,
    budgetId: string,
  ): Promise<GenerationJobStorageResponse> {
    const parent = await this.findRevisionParent(input.parentJobId, input.ownerId);
    if (!parent || parent.evidenceBundle === null || !parent.evidenceBundleHash) {
      return { result: GenerationJobStorageResult.STORAGE_ERROR };
    }
    const originalRequest = enqueueGenerationSchema.safeParse(parent.request);
    if (!originalRequest.success) return { result: GenerationJobStorageResult.STORAGE_ERROR };
    const request = {
      kind: 'revision-review' as const,
      ...input,
      topic: originalRequest.data.topic,
      publicationType: originalRequest.data.publicationType,
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
      const job = await this.prisma.threadGenerationJob.create({
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
      return { result: GenerationJobStorageResult.SUCCESS, job };
    } catch (error: unknown) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        return { result: GenerationJobStorageResult.STORAGE_ERROR };
      }
      const raced = await this.prisma.threadGenerationJob.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      return raced &&
        raced.ownerId === input.ownerId &&
        stableJson(this.revisionRequestForIdempotency(raced.request)) ===
          stableJson(this.revisionRequestForIdempotency(request))
        ? { result: GenerationJobStorageResult.SUCCESS, job: raced }
        : { result: GenerationJobStorageResult.CONFLICT };
    }
  }

  async findQueued(id: string) {
    return this.prisma.threadGenerationJob.findFirst({
      where: { id, status: ThreadGenerationStatus.QUEUED },
    });
  }

  async findOwnerState(id: string, ownerId: string) {
    return this.prisma.threadGenerationJob.findFirst({
      where: { id, ownerId },
      select: {
        id: true,
        status: true,
        stage: true,
        round: true,
        safeErrorCode: true,
        revisions: {
          orderBy: { revision: 'desc' },
          take: 1,
          select: { content: true },
        },
      },
    });
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

  async findDispatchable(limit: number) {
    const now = new Date();
    return this.prisma.threadGenerationJob.findMany({
      where: {
        status: ThreadGenerationStatus.QUEUED,
        nextAttemptAt: { lte: now },
        OR: [{ dispatchLeaseExpiresAt: null }, { dispatchLeaseExpiresAt: { lte: now } }],
      },
      orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: { id: true },
    });
  }

  async findPendingBudgetClosures(limit: number) {
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
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: { id: true, budgetId: true, status: true },
    });
  }

  async markBudgetClosed(jobId: string, status: GenerationBudgetCloseStatus): Promise<void> {
    await this.prisma.threadGenerationJob.updateMany({
      where: { id: jobId, budgetClosedAt: null },
      data: { budgetCloseStatus: status, budgetClosedAt: new Date() },
    });
  }

  async loadResumeState(jobId: string) {
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

  async requestCancellation(jobId: string) {
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
  ) {
    const communication = await this.prisma.threadModelCommunication.findUnique({
      where: { jobId_role_round: { jobId, role, round } },
      select: { evidenceBundleHash: true, inputHash: true, output: true },
    });
    return communication?.evidenceBundleHash === evidenceHash &&
      communication.inputHash === inputHash
      ? communication.output
      : null;
  }

  async claim(id: string, workerId: string) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.threadGenerationJob.updateMany({
        where: {
          id,
          status: ThreadGenerationStatus.QUEUED,
          nextAttemptAt: { lte: now },
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
      let slotClaimed = false;
      for (const slotId of GENERATION_WORKER_SLOT_IDS) {
        const slot = await tx.threadGenerationWorkerSlot.updateMany({
          where: {
            slotId,
            OR: [{ jobId: null }, { leaseExpiresAt: { lte: now } }],
          },
          data: {
            jobId: id,
            workerId,
            leaseExpiresAt: new Date(now.getTime() + GENERATION_LEASE_MS),
            heartbeatAt: now,
          },
        });
        if (slot.count === 1) {
          slotClaimed = true;
          break;
        }
      }
      if (!slotClaimed) {
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
      const attempt = job.attemptCount;
      await tx.threadGenerationAttempt.create({
        data: { jobId: id, attempt, workerId },
      });
      return job;
    });
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

  async retryOrFail(jobId: string, attempt: number): Promise<GenerationJobRecoveryOutcome> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.threadGenerationJob.findFirst({
        where: { id: jobId, status: ThreadGenerationStatus.RUNNING, attemptCount: attempt },
        select: { cancelRequestedAt: true },
      });
      if (!job) return GenerationJobRecoveryOutcome.MISSING;
      const cancelled = job.cancelRequestedAt !== null;
      const retry = !cancelled && attempt < MAX_GENERATION_ATTEMPTS;
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
    return this.prisma.$transaction(async (tx) => {
      const stale = await tx.threadGenerationJob.findMany({
        where: { status: ThreadGenerationStatus.RUNNING, leaseExpiresAt: { lte: now } },
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
            completedAt: now,
            leaseOwner: null,
            leaseExpiresAt: null,
          };
        }
        const recoveredCount = await tx.threadGenerationJob.updateMany({
          where: {
            id: job.id,
            status: ThreadGenerationStatus.RUNNING,
            leaseExpiresAt: { lte: now },
          },
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
}
