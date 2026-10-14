import {
  Locale,
  ThreadFailureClass,
  ThreadFailurePhase,
  ThreadFailureRemedy,
  ThreadHealingResult,
  ThreadHealingStrategy,
  ThreadPublicationType,
} from '@claw/shared-types';

import { AppConfig } from '../../../../app/config/app.config';
import type { StartThreadGenerationDto } from '../../dto/start-thread-generation.dto';
import { ThreadsGenerationClient } from '../threads-generation.client';

const pool = {
  pool: [{ provider: 'GEMINI', model: 'flash', windowTokens: 1_000_000, costRank: 0 }],
  safeDefault: { provider: 'GEMINI', model: 'flash', windowTokens: 1_000_000, costRank: 0 },
};

const start: StartThreadGenerationDto = {
  capMicroUsd: 2_000_000,
  sourceThreadId: 'thread-1',
  idempotencyKey: 'key-1',
  correlationId: 'corr-1',
  publicIntentVersion: 'threads-public-v1',
  contentLocale: Locale.EN,
  topic: 'A sufficiently detailed topic for research',
  publicationType: ThreadPublicationType.ARTICLE,
  authors: [],
  judge: { id: 'judge', provider: 'GEMINI', model: 'm', maxOutputTokens: 1024, fallbacks: [] },
  critic: { id: 'critic', provider: 'GEMINI', model: 'm', maxOutputTokens: 1024, fallbacks: [] },
};

const progress = {
  jobId: 'job-1',
  status: 'FAILED',
  stage: 'AUTHOR_DRAFTS',
  round: 1,
  attemptCount: 3,
  maxAttempts: 3,
  spentMicroCredits: '0',
  createdAt: '2026-10-14T10:00:00.000Z',
  updatedAt: '2026-10-14T10:01:00.000Z',
  selections: {
    topic: 'Topic',
    publicationType: 'article',
    contentLocale: 'en',
    sourceThreadId: 't-1',
    spendCapMicroUsd: '1',
    roles: [],
  },
  steps: [],
};

describe('ThreadsGenerationClient healing hand-off (ADR-181)', () => {
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

  const stub = (body: unknown) => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) });
    vi.stubGlobal('fetch', fetch);
    return fetch;
  };

  it('sends the healing pool with a start', async () => {
    const fetch = stub({ jobId: 'job-1', status: 'QUEUED' });
    await new ThreadsGenerationClient().enqueue('owner-1', start, pool);
    const body = JSON.parse(String((fetch.mock.calls[0]?.[1] as RequestInit).body)) as {
      healing: unknown;
    };
    expect(body.healing).toEqual(pool);
  });

  it('sends no healing key at all when there is no pool', async () => {
    const fetch = stub({ jobId: 'job-1', status: 'QUEUED' });
    await new ThreadsGenerationClient().enqueue('owner-1', start);
    expect(String((fetch.mock.calls[0]?.[1] as RequestInit).body)).not.toContain('healing');
  });

  it('sends the pool and the shorter-article remedy with a retry', async () => {
    const fetch = stub({ jobId: 'job-2', status: 'QUEUED' });
    await new ThreadsGenerationClient().retry(
      'job-1',
      'owner-1',
      { idempotencyKey: 'r1', articleLength: 'SHORT' as never },
      pool,
    );
    const body = JSON.parse(String((fetch.mock.calls[0]?.[1] as RequestInit).body)) as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({ articleLength: 'SHORT', healing: pool, ownerId: 'owner-1' });
  });

  it('passes the failure phase, class, remedies and the healing attempts through to the owner', async () => {
    const failure = {
      code: 'OUTPUT_INVALID',
      failedStage: 'AUTHOR_DRAFTS',
      roleId: 'author-1',
      httpStatus: null,
      retryable: true,
      phase: ThreadFailurePhase.AUTHOR,
      failureClass: ThreadFailureClass.WRONG_SHAPE,
      remedies: [ThreadFailureRemedy.TRY_SUGGESTED_MODEL, ThreadFailureRemedy.USE_RECOMMENDED_TEAM],
      suggestedModel: { provider: 'GEMINI', model: 'flash' },
    };
    const healing = {
      active: false,
      attempts: [
        {
          seq: 4,
          phase: ThreadFailurePhase.AUTHOR,
          roleId: 'author-1',
          strategy: ThreadHealingStrategy.STRICT_PROMPT,
          failureClass: ThreadFailureClass.WRONG_SHAPE,
          provider: 'OPENROUTER',
          model: 'a',
          result: ThreadHealingResult.FAILED,
        },
      ],
    };
    stub({ ...progress, failure, healing });

    const result = await new ThreadsGenerationClient().getProgress('job-1', 'owner-1');

    expect(result.failure).toEqual(failure);
    expect(result.healing).toEqual(healing);
  });

  it('still reads progress from an older generation service that sends none of it', async () => {
    stub({
      ...progress,
      failure: {
        code: 'PROVIDER_ERROR',
        failedStage: 'JUDGE',
        roleId: 'judge',
        httpStatus: 503,
        retryable: true,
      },
    });
    const result = await new ThreadsGenerationClient().getProgress('job-1', 'owner-1');
    expect(result.failure?.failureClass).toBeUndefined();
    expect(result.healing).toBeUndefined();
  });
});
