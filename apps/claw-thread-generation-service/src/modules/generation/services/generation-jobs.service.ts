import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
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

import { GENERATION_WORKER_ID, generationEventSchema } from '../constants/generation.constants';
import { GenerationJobStorageResult } from '../../../common/enums/generation-job-storage-result.enum';

@Injectable()
export class GenerationJobsService implements OnModuleInit {
  private readonly logger = new Logger(GenerationJobsService.name);
  constructor(
    private readonly snapshots: ChatSnapshotClient,
    private readonly repository: GenerationJobsRepository,
    private readonly rabbit: RabbitMQService,
    private readonly pipeline: GenerationPipelineManager,
    private readonly budgets: ThreadBudgetClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.subscribe();
  }

  async enqueue(input: EnqueueGenerationDto) {
    const snapshot = await this.snapshots.getOwnedSnapshot(input.ownerId, input.sourceThreadId);
    const stored = await this.repository.createQueued(
      input,
      JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>,
      snapshot.sha256,
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
    if (job.status === 'QUEUED') {
      const payload: ThreadGenerationRequestedPayload = {
        jobId: job.id,
        correlationId: input.correlationId,
        requestedAt: new Date().toISOString(),
      };
      await this.rabbit.publishConfirmed(EventPattern.THREAD_GENERATION_REQUESTED, payload);
    }
    return { jobId: job.id, status: job.status };
  }

  async cancel(jobId: string) {
    const result = await this.repository.requestCancellation(jobId);
    if (!result) return { jobId, status: 'NOT_FOUND' };
    if (result.queued && result.budgetId) {
      await this.budgets.close(result.budgetId, 'RELEASED');
    }
    return { jobId, status: result.status };
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
    try {
      const source = z.record(z.string(), z.unknown()).parse(job.sourceSnapshot);
      const result = await this.pipeline.generate({
        jobId: job.id,
        ownerId: job.ownerId,
        budgetId: job.budgetId,
        correlationId: event.correlationId,
        topic: request.topic,
        publicationType: request.publicationType,
        sourceSnapshot: source,
        authors: request.authors,
        judge: request.judge,
        critic: request.critic,
        isCancellationRequested: () => this.repository.isCancellationRequested(job.id),
      });
      if (await this.repository.isCancellationRequested(job.id)) {
        throw new ThreadGenerationCancelledError();
      }
      await this.budgets.close(job.budgetId, 'FINALIZED');
      await this.repository.saveResult(job.id, result);
      await this.repository.completeAttempt(job.id, job.attemptCount);
    } catch (error: unknown) {
      if (error instanceof ThreadGenerationCancelledError) {
        try {
          await this.budgets.close(job.budgetId, 'RELEASED');
        } catch {
          this.logger.error('Cancelled generation budget could not be released');
        }
        await this.repository.finishCancelled(job.id, job.attemptCount);
        return;
      }
      try {
        await this.budgets.close(job.budgetId, 'RELEASED');
      } catch {
        this.logger.error('Generation failed and its aggregate budget could not be released');
      }
      await this.repository.fail(job.id, job.attemptCount);
    }
  }
}
