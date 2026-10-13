import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import { ThreadGenerationErrorCode } from '../../../common/enums/thread-generation-error-code.enum';
import { codedErrorBody } from '../../../common/utilities/coded-error-body.utility';
import {
  GENERATION_JOB_NOT_FOUND_MESSAGE,
  SOURCE_THREAD_NOT_FOUND_MESSAGE,
} from '../constants/generation-preflight.constants';
import type { StartThreadGenerationDto } from '../dto/start-thread-generation.dto';
import type { RetryThreadGenerationDto } from '../dto/retry-thread-generation.dto';
import {
  generationDeleteResponseSchema,
  generationProgressSchema,
  generationRetryResponseSchema,
} from '../schemas/generation-progress.schema';
import type {
  GenerationEnqueueInput,
  OwnerGenerationProgress,
  PrivateGenerationState,
  RevisionReviewEnqueueInput,
} from '../types/generation.types';

const enqueueResponseSchema = z.object({ jobId: z.string(), status: z.string() });
const privateStateSchema = z.object({
  jobId: z.string(),
  status: z.string(),
  stage: z.string(),
  round: z.number().int().nonnegative(),
  safeErrorCode: z.string().nullable(),
  review: z
    .object({
      draftHash: z.string().length(64),
      authorConsensus: z.boolean(),
      ready: z.boolean(),
      reasons: z.array(z.string()),
    })
    .nullable(),
  draft: z
    .object({
      markdown: z.string(),
      citations: z.array(z.object({ evidenceId: z.string(), url: z.string().url() })),
      judgeScore: z.number().int().min(0).max(100),
      criticScore: z.number().int().min(0).max(100),
    })
    .nullable(),
});

@Injectable()
export class ThreadsGenerationClient {
  async enqueue(
    ownerId: string,
    input: StartThreadGenerationDto,
  ): Promise<{ jobId: string; status: string }> {
    const body: GenerationEnqueueInput = {
      sourceThreadId: input.sourceThreadId,
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId,
      spendCapMicroUsd: String(input.capMicroUsd),
      topic: input.topic,
      publicationType: input.publicationType,
      contentLocale: input.contentLocale,
      publicIntentVersion: input.publicIntentVersion,
      authors: input.authors,
      judge: input.judge,
      critic: input.critic,
    };
    // A 404 here is the source chat thread: missing and another user's look the same.
    const result = await this.request(
      '/api/v1/internal/threads/generations',
      { method: 'POST', body: JSON.stringify({ ...body, ownerId }) },
      SOURCE_THREAD_NOT_FOUND_MESSAGE,
    );
    const parsed = enqueueResponseSchema.safeParse(result);
    if (!parsed.success) throw new ServiceUnavailableException('Generation response is invalid');
    return parsed.data;
  }

  async getPrivateState(jobId: string, ownerId: string): Promise<PrivateGenerationState> {
    const result = await this.request(
      `/api/v1/internal/threads/generations/${encodeURIComponent(jobId)}/owner-state`,
      { method: 'POST', body: JSON.stringify({ ownerId }) },
    );
    const parsed = privateStateSchema.safeParse(result);
    if (!parsed.success) throw new ServiceUnavailableException('Generation response is invalid');
    return parsed.data;
  }

  async enqueueRevisionReview(
    ownerId: string,
    input: RevisionReviewEnqueueInput,
  ): Promise<{ jobId: string; status: string }> {
    const result = await this.request('/api/v1/internal/threads/generations/revision-reviews', {
      method: 'POST',
      body: JSON.stringify({ ...input, ownerId }),
    });
    const parsed = enqueueResponseSchema.safeParse(result);
    if (!parsed.success) throw new ServiceUnavailableException('Generation response is invalid');
    return parsed.data;
  }

  async getProgress(jobId: string, ownerId: string): Promise<OwnerGenerationProgress> {
    const result = await this.request(this.jobPath(jobId, 'progress'), {
      method: 'POST',
      body: JSON.stringify({ ownerId }),
    });
    const parsed = generationProgressSchema.safeParse(result);
    if (!parsed.success) throw new ServiceUnavailableException('Generation response is invalid');
    return parsed.data;
  }

  async retry(
    jobId: string,
    ownerId: string,
    input: RetryThreadGenerationDto,
  ): Promise<{ jobId: string; status: string }> {
    const result = await this.request(this.jobPath(jobId, 'retry'), {
      method: 'POST',
      body: JSON.stringify({ ...input, ownerId }),
    });
    const parsed = generationRetryResponseSchema.safeParse(result);
    if (!parsed.success) throw new ServiceUnavailableException('Generation response is invalid');
    return parsed.data;
  }

  async deleteJob(jobId: string, ownerId: string): Promise<void> {
    const result = await this.request(this.jobPath(jobId, 'delete'), {
      method: 'POST',
      body: JSON.stringify({ ownerId }),
    });
    if (!generationDeleteResponseSchema.safeParse(result).success) {
      throw new ServiceUnavailableException('Generation response is invalid');
    }
  }

  async cancel(jobId: string): Promise<void> {
    await this.request(`/api/v1/internal/threads/generations/${encodeURIComponent(jobId)}/cancel`, {
      method: 'POST',
    });
  }

  private jobPath(jobId: string, action: string): string {
    return `/api/v1/internal/threads/generations/${encodeURIComponent(jobId)}/${action}`;
  }

  private async request(
    path: string,
    options: { method: string; body?: string },
    notFoundMessage: string = GENERATION_JOB_NOT_FOUND_MESSAGE,
  ): Promise<unknown> {
    const config = AppConfig.get();
    const url = `${config.THREAD_GENERATION_SERVICE_URL}${path}`;
    assertSafeRequestUrl(url, declaredHost(config.THREAD_GENERATION_SERVICE_URL));
    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        redirect: 'error',
        headers: {
          Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ServiceUnavailableException('Generation service is unavailable');
    }
    if (!response.ok) {
      if (response.status === 400) throw new BadRequestException('Generation request is invalid');
      if (response.status === 403) {
        throw new ForbiddenException(
          codedErrorBody(
            'Your plan does not include everything Thread generation needs (web research, Judge and Critic review). Upgrade your plan or ask an administrator.',
            ThreadGenerationErrorCode.NOT_IN_PLAN,
            HttpStatus.FORBIDDEN,
          ),
        );
      }
      if (response.status === 404) throw new NotFoundException(notFoundMessage);
      if (response.status === 409)
        throw new ConflictException('Generation request conflicts with an existing job');
      throw new ServiceUnavailableException(
        `Generation request failed (${String(response.status)})`,
      );
    }
    return response.json();
  }
}
