import type { ThreadGenerationProgress, ThreadGenerationStep } from '@claw/shared-types';

export function makeStep(overrides: Partial<ThreadGenerationStep> = {}): ThreadGenerationStep {
  return {
    seq: 1,
    at: '2026-10-13T10:00:00.000Z',
    stage: 'AUTHOR_DRAFTS',
    round: 1,
    outcome: 'SUCCEEDED',
    roleKind: 'AUTHOR',
    roleId: 'author-1',
    provider: 'OPENAI',
    model: 'gpt-x',
    code: null,
    httpStatus: null,
    durationMs: 1500,
    inputTokens: 120,
    outputTokens: 480,
    excerpt: 'Draft opening paragraph',
    ...overrides,
  };
}

export function makeProgress(
  overrides: Partial<ThreadGenerationProgress> = {},
): ThreadGenerationProgress {
  return {
    publicationId: 'pub-1',
    jobId: 'job-1',
    status: 'FAILED',
    stage: 'AUTHOR_DRAFTS',
    round: 1,
    attemptCount: 1,
    maxAttempts: 3,
    spentMicroCredits: '12300',
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:01:00.000Z',
    selections: {
      topic: 'How heat pumps work',
      publicationType: 'ARTICLE',
      contentLocale: 'en',
      sourceThreadId: 'thread-1',
      spendCapMicroUsd: '1000000',
      roles: [
        {
          roleId: 'author-1',
          roleKind: 'AUTHOR',
          provider: 'OPENAI',
          model: 'gpt-x',
          fallbacks: [{ provider: 'GEMINI', model: 'gem-y' }],
        },
        {
          roleId: 'judge',
          roleKind: 'JUDGE',
          provider: 'OLLAMA',
          model: 'oll-z',
          fallbacks: [],
        },
        { roleId: 'critic', roleKind: 'CRITIC', provider: 'OLLAMA', model: 'oll-z', fallbacks: [] },
      ],
    },
    failure: {
      code: 'PAYG_CREDIT_EXHAUSTED',
      failedStage: 'AUTHOR_DRAFTS',
      roleId: 'author-1',
      httpStatus: 402,
      retryable: true,
    },
    steps: [
      makeStep(),
      makeStep({
        seq: 2,
        outcome: 'FAILED',
        code: 'PAYG_CREDIT_EXHAUSTED',
        httpStatus: 402,
        excerpt: null,
        durationMs: null,
        inputTokens: null,
        outputTokens: null,
      }),
    ],
    ...overrides,
  };
}
