import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma, ThreadGenerationStage, ThreadGenerationStatus } from '../../../generated/prisma';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { EnqueueGenerationDto } from '../dto/enqueue-generation.dto';
import type { GenerationPipelineResult } from '../types/generation-pipeline.types';
import type { ChatModelResponse } from '../../models/chat-model.client';
import { stableJson } from '../utilities/stable-json.utility';
import { GenerationJobStorageResult } from '../../../common/enums/generation-job-storage-result.enum';
import type { GenerationJobStorageResponse } from '../types/generation-job-storage.types';

@Injectable()
export class GenerationJobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createQueued(
    input: EnqueueGenerationDto,
    sourceSnapshot: Record<string, unknown>,
    hash: string,
  ): Promise<GenerationJobStorageResponse> {
    const existing = await this.prisma.threadGenerationJob.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      return existing.ownerId !== input.ownerId ||
        existing.sourceSnapshotHash !== hash ||
        stableJson(existing.request) !== stableJson(input) ? { result: GenerationJobStorageResult.CONFLICT } : { result: GenerationJobStorageResult.SUCCESS, job: existing };
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
          budgetId: input.budgetId,
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
        raced.sourceSnapshotHash === hash &&
        stableJson(raced.request) === stableJson(input) ? { result: GenerationJobStorageResult.SUCCESS, job: raced } : { result: GenerationJobStorageResult.CONFLICT };
    }
  }

  async findQueued(id: string) {
    return this.prisma.threadGenerationJob.findFirst({
      where: { id, status: ThreadGenerationStatus.QUEUED },
    });
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

  async finishCancelled(jobId: string, attempt: number): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.threadGenerationJob.updateMany({
        where: { id: jobId, status: ThreadGenerationStatus.RUNNING },
        data: {
          status: ThreadGenerationStatus.CANCELLED,
          leaseOwner: null,
          leaseExpiresAt: null,
          completedAt: new Date(),
        },
      }),
      this.prisma.threadGenerationAttempt.updateMany({
        where: { jobId, attempt, finishedAt: null },
        data: { finishedAt: new Date(), outcome: 'CANCELLED' },
      }),
    ]);
  }

  async saveResearchEvidence(
    jobId: string,
    evidence: {
      researchRunId: string;
      bundle: Record<string, unknown>;
      sha256: string;
      version: 1;
    },
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.threadGenerationJob.update({
        where: { id: jobId },
        data: {
          stage: ThreadGenerationStage.AUTHOR_DRAFTS,
          evidenceBundle: evidence.bundle as Prisma.InputJsonValue,
          evidenceBundleHash: evidence.sha256,
          evidenceVersion: evidence.version,
        },
      });
      await tx.threadGenerationCheckpoint.create({
        data: {
          jobId,
          stage: ThreadGenerationStage.RESEARCH,
          round: 0,
          data: { researchRunId: evidence.researchRunId, evidenceHash: evidence.sha256 },
          dataHash: evidence.sha256,
        },
      });
    });
  }

  async saveCommunication(input: {
    jobId: string;
    role: string;
    round: number;
    inputHash: string;
    evidenceHash: string;
    response: ChatModelResponse;
    output: Record<string, unknown>;
  }): Promise<void> {
    const output = JSON.parse(JSON.stringify(input.output)) as Prisma.InputJsonValue;
    const usage: Prisma.InputJsonValue = {
      inputTokens: input.response.inputTokens ?? null,
      outputTokens: input.response.outputTokens ?? null,
      durationMs: input.response.durationMs,
    };
    await this.prisma.threadModelCommunication.create({
      data: {
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
    });
  }

  async claim(id: string, workerId: string) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.threadGenerationJob.updateMany({
        where: { id, status: ThreadGenerationStatus.QUEUED },
        data: {
          status: ThreadGenerationStatus.RUNNING,
          stage: ThreadGenerationStage.RESEARCH,
          attemptCount: { increment: 1 },
          leaseOwner: workerId,
          leaseExpiresAt: new Date(now.getTime() + 300_000),
        },
      });
      if (claimed.count !== 1) return null;
      const job = await tx.threadGenerationJob.findUnique({ where: { id } });
      if (!job) return null;
      const attempt = job.attemptCount;
      await tx.threadGenerationAttempt.create({
        data: { jobId: id, attempt, workerId },
      });
      return job;
    });
  }

  async saveResult(jobId: string, result: GenerationPipelineResult): Promise<void> {
    const evidence = result.evidenceBundle as Prisma.InputJsonValue;
    const revision = {
      markdown: result.markdown,
      citations: result.citations,
      judge: result.judgeReview,
      critic: result.criticReview,
    } as Prisma.InputJsonValue;
    await this.prisma.$transaction(async (tx) => {
      await tx.threadGenerationJob.update({
        where: { id: jobId },
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
    });
  }

  async fail(jobId: string, attempt: number): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.threadGenerationJob.updateMany({
        where: { id: jobId, status: ThreadGenerationStatus.RUNNING },
        data: {
          status: ThreadGenerationStatus.FAILED,
          safeErrorCode: 'GENERATION_FAILED',
          leaseOwner: null,
          leaseExpiresAt: null,
          completedAt: new Date(),
        },
      }),
      this.prisma.threadGenerationAttempt.updateMany({
        where: { jobId, attempt, finishedAt: null },
        data: { finishedAt: new Date(), outcome: 'FAILED', safeErrorCode: 'GENERATION_FAILED' },
      }),
    ]);
  }

  async completeAttempt(jobId: string, attempt: number): Promise<void> {
    await this.prisma.threadGenerationAttempt.updateMany({
      where: { jobId, attempt, finishedAt: null },
      data: { finishedAt: new Date(), outcome: 'WAITING_FOR_REVIEW' },
    });
  }
}
