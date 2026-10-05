import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import type { StartThreadGenerationDto } from '../dto/start-thread-generation.dto';
import type { GenerationEnqueueInput, PrivateGenerationState } from '../types/generation.types';

const enqueueResponseSchema = z.object({ jobId: z.string(), status: z.string() });
const privateStateSchema = z.object({
  jobId: z.string(),
  status: z.string(),
  stage: z.string(),
  round: z.number().int().nonnegative(),
  safeErrorCode: z.string().nullable(),
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
      publicIntentVersion: input.publicIntentVersion,
      authors: input.authors,
      judge: input.judge,
      critic: input.critic,
    };
    const result = await this.request('/api/v1/internal/threads/generations', {
      method: 'POST',
      body: JSON.stringify({ ...body, ownerId }),
    });
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

  async cancel(jobId: string): Promise<void> {
    await this.request(`/api/v1/internal/threads/generations/${encodeURIComponent(jobId)}/cancel`, {
      method: 'POST',
    });
  }

  private async request(
    path: string,
    options: { method: string; body?: string },
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
      if (response.status === 403) throw new ForbiddenException('Generation is not permitted');
      if (response.status === 404) throw new NotFoundException('Generation job not found');
      if (response.status === 409)
        throw new ConflictException('Generation request conflicts with an existing job');
      throw new ServiceUnavailableException(
        `Generation request failed (${String(response.status)})`,
      );
    }
    return response.json();
  }
}
