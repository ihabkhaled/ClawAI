import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { AppConfig } from '../../../../app/config/app.config';
import type { StartThreadGenerationDto } from '../../dto/start-thread-generation.dto';
import { ThreadsGenerationClient } from '../threads-generation.client';

describe('ThreadsGenerationClient', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'j'.repeat(32));
    vi.stubEnv('THREADS_DATABASE_URL', 'postgresql://threads:secret@localhost:5432/threads');
    vi.stubEnv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672');
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
    vi.stubEnv('THREAD_GENERATION_SERVICE_URL', 'https://thread-generation-service:4020');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 't'.repeat(32));
    AppConfig.validate();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends the owner-selected cap and exact candidate to the internal review queue', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: 'review-job', status: 'QUEUED' }),
    });
    vi.stubGlobal('fetch', fetch);
    const client = new ThreadsGenerationClient();

    await expect(
      client.enqueueRevisionReview('owner-1', {
        parentJobId: 'generation-job',
        idempotencyKey: 'edit-key',
        correlationId: 'edit-correlation',
        spendCapMicroUsd: '2500000',
        draft: {
          markdown: '# Edited article',
          citations: [{ evidenceId: 'source-1', url: 'https://example.test/source' }],
        },
      }),
    ).resolves.toEqual({ jobId: 'review-job', status: 'QUEUED' });
    expect(fetch).toHaveBeenCalledWith(
      'https://thread-generation-service:4020/api/v1/internal/threads/generations/revision-reviews',
      expect.objectContaining({
        method: 'POST',
        redirect: 'error',
        body: expect.stringContaining('"spendCapMicroUsd":"2500000"'),
      }),
    );
  });

  const base = 'https://thread-generation-service:4020/api/v1/internal/threads/generations/job-1';
  const progress = {
    jobId: 'job-1',
    status: 'FAILED',
    stage: 'AUTHOR_DRAFTS',
    round: 1,
    attemptCount: 1,
    maxAttempts: 3,
    spentMicroCredits: '0',
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:01:00.000Z',
    selections: {
      topic: 'Topic',
      publicationType: 'article',
      contentLocale: 'en',
      sourceThreadId: 't-1',
      spendCapMicroUsd: '1',
      roles: [],
    },
    failure: null,
    steps: [],
  };

  function stubFetch(response: { ok: boolean; status?: number; json?: () => Promise<unknown> }) {
    const fetch = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetch);
    return fetch;
  }

  it('fetches owner progress through the internal route', async () => {
    const fetch = stubFetch({ ok: true, json: async () => progress });

    // The gateway fills allowanceRefunded=false when the generation service did not send it.
    await expect(new ThreadsGenerationClient().getProgress('job-1', 'owner-1')).resolves.toEqual({
      ...progress,
      allowanceRefunded: false,
    });
    expect(fetch).toHaveBeenCalledWith(
      `${base}/progress`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ ownerId: 'owner-1' }) }),
    );
  });

  it('keeps a 404 from the progress route as a 404', async () => {
    stubFetch({ ok: false, status: 404 });
    await expect(new ThreadsGenerationClient().getProgress('job-1', 'o')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a malformed progress body', async () => {
    stubFetch({ ok: true, json: async () => ({ jobId: 1 }) });
    await expect(new ThreadsGenerationClient().getProgress('job-1', 'o')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('sends the retry changes with the owner id', async () => {
    const fetch = stubFetch({ ok: true, json: async () => ({ jobId: 'job-2', status: 'QUEUED' }) });

    await expect(
      new ThreadsGenerationClient().retry('job-1', 'owner-1', {
        idempotencyKey: 'retry-1',
        spendCapUsd: 3,
      }),
    ).resolves.toEqual({ jobId: 'job-2', status: 'QUEUED' });
    expect(fetch).toHaveBeenCalledWith(
      `${base}/retry`,
      expect.objectContaining({
        body: JSON.stringify({ idempotencyKey: 'retry-1', spendCapUsd: 3, ownerId: 'owner-1' }),
      }),
    );
  });

  it('rejects a malformed retry body', async () => {
    stubFetch({ ok: true, json: async () => ({}) });
    await expect(
      new ThreadsGenerationClient().retry('job-1', 'o', { idempotencyKey: 'k' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('deletes a job and rejects an unconfirmed delete', async () => {
    const fetch = stubFetch({ ok: true, json: async () => ({ deleted: true }) });
    await expect(
      new ThreadsGenerationClient().deleteJob('job-1', 'owner-1'),
    ).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      `${base}/delete`,
      expect.objectContaining({ method: 'POST' }),
    );

    stubFetch({ ok: true, json: async () => ({ deleted: false }) });
    await expect(new ThreadsGenerationClient().deleteJob('job-1', 'o')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it.each([
    [400, BadRequestException],
    [403, ForbiddenException],
    [409, ConflictException],
    [500, ServiceUnavailableException],
  ])('maps upstream %i to a typed error', async (status, expected) => {
    stubFetch({ ok: false, status });
    await expect(new ThreadsGenerationClient().getProgress('job-1', 'o')).rejects.toBeInstanceOf(
      expected,
    );
  });

  it('answers a 403 from the budget step with a machine code and a plain plan message', async () => {
    stubFetch({ ok: false, status: 403 });

    const failure = await new ThreadsGenerationClient()
      .getProgress('job-1', 'o')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ForbiddenException);
    expect((failure as ForbiddenException).getResponse()).toMatchObject({
      code: 'THREAD_GENERATION_NOT_IN_PLAN',
      statusCode: 403,
      message: expect.stringContaining('web research, Judge and Critic review'),
    });
  });

  it('keeps used, limit and window when the budget step says the allowance is used up', async () => {
    stubFetch({
      ok: false,
      status: 403,
      json: async () => ({
        statusCode: 403,
        code: 'THREAD_ALLOWANCE_UNAVAILABLE',
        message: 'Your plan allows 1 Thread generation with Judge review, and 1 is used.',
        feature: 'JUDGE_MODE',
        reason: 'LIMIT_REACHED',
        used: 1,
        limit: 1,
        window: 'LIFETIME',
      }),
    });

    const failure = await new ThreadsGenerationClient()
      .getProgress('job-1', 'o')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ForbiddenException);
    expect((failure as ForbiddenException).getResponse()).toEqual({
      code: 'THREAD_GENERATION_ALLOWANCE_UNAVAILABLE',
      statusCode: 403,
      message: 'Your plan allows 1 Thread generation with Judge review, and 1 is used.',
      feature: 'JUDGE_MODE',
      used: 1,
      limit: 1,
      window: 'LIFETIME',
    });
  });

  it('answers a 404 on enqueue as a missing source thread, with the same body as not found', async () => {
    stubFetch({ ok: false, status: 404 });
    const input = {
      sourceThreadId: 'thread-of-someone-else',
      idempotencyKey: 'key-1',
      correlationId: 'corr-1',
      capMicroUsd: 2_000_000,
      topic: 'A sufficiently detailed topic for research',
    } as StartThreadGenerationDto;

    const failure = await new ThreadsGenerationClient()
      .enqueue('owner-1', input)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(NotFoundException);
    expect((failure as NotFoundException).message).toBe('Source thread not found');
  });

  it('reports an unreachable generation service', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    await expect(new ThreadsGenerationClient().getProgress('job-1', 'o')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
