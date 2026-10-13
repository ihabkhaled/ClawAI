import { BadRequestException } from '@nestjs/common';
import { Locale, ThreadPublicationType } from '@claw/shared-types';

import type { EnqueueGenerationDto } from '../../dto/enqueue-generation.dto';
import type { StepRow } from '../../types/step-recorder.types';
import { buildProgress } from '../build-progress.utility';
import { buildRetryInput, usdToMicroUsd } from '../build-retry-input.utility';

const role = (id: string, provider = 'OPENAI') => ({
  id,
  provider,
  model: 'm',
  maxOutputTokens: 1024,
  fallbacks: [{ provider: 'GEMINI', model: 'g' }],
});

const request = {
  ownerId: 'owner-1',
  sourceThreadId: 'thread-1',
  idempotencyKey: 'key-1',
  correlationId: 'corr-1',
  spendCapMicroUsd: '5000000',
  publicIntentVersion: 'threads-public-v1',
  topic: 'A detailed topic',
  publicationType: 'article',
  contentLocale: 'en',
  authors: [role('author-1'), role('author-2'), role('author-3')],
  judge: role('judge'),
  critic: role('critic'),
};

const job = (status: string) => ({
  id: 'job-1',
  status,
  stage: 'AUTHOR_DRAFTS',
  round: 1,
  attemptCount: 2,
  spentMicroCredits: 12n,
  spendCapMicroUsd: 5_000_000n,
  sourceThreadId: 'thread-1',
  safeErrorCode: 'GENERATION_FAILED',
  request,
  createdAt: new Date('2026-10-13T10:00:00.000Z'),
  updatedAt: new Date('2026-10-13T10:01:00.000Z'),
});

const step = (overrides: Partial<StepRow>): StepRow => ({
  seq: 1,
  at: new Date('2026-10-13T10:00:30.000Z'),
  stage: 'AUTHOR_DRAFTS',
  round: 1,
  outcome: 'FAILED',
  roleKind: 'AUTHOR',
  roleId: 'author-1',
  provider: 'OPENAI',
  model: 'm',
  code: 'PAYG_CREDIT_EXHAUSTED',
  httpStatus: 402,
  durationMs: 5,
  inputTokens: null,
  outputTokens: null,
  excerpt: null,
  ...overrides,
});

describe('buildProgress', () => {
  it('shows every selection and the failing role for a failed job', () => {
    const result = buildProgress(job('FAILED'), request, [
      step({}),
      step({
        seq: 2,
        roleKind: 'SYSTEM',
        roleId: null,
        stage: 'GENERATION',
        code: 'PAYG_CREDIT_EXHAUSTED',
        httpStatus: 402,
      }),
    ]);
    expect(result.selections.roles).toHaveLength(5);
    expect(result.selections.roles[3]).toMatchObject({ roleId: 'judge', roleKind: 'JUDGE' });
    expect(result.selections.spendCapMicroUsd).toBe('5000000');
    expect(result.spentMicroCredits).toBe('12');
    expect(result.maxAttempts).toBe(3);
    expect(result.failure).toEqual({
      code: 'PAYG_CREDIT_EXHAUSTED',
      failedStage: 'AUTHOR_DRAFTS',
      roleId: 'author-1',
      httpStatus: 402,
      retryable: true,
    });
    expect(result.steps[0]?.at).toBe('2026-10-13T10:00:30.000Z');
  });

  it('uses the job stage when only the final system step failed', () => {
    const result = buildProgress(job('FAILED'), request, [
      step({ roleKind: 'SYSTEM', roleId: null, stage: 'GENERATION', code: 'REVIEW_NOT_PASSED' }),
    ]);
    expect(result.failure).toMatchObject({
      code: 'REVIEW_NOT_PASSED',
      failedStage: 'AUTHOR_DRAFTS',
    });
  });

  it('takes the code from the last failed step, including the final generation step', () => {
    const result = buildProgress(job('FAILED'), request, [
      step({ seq: 1, code: 'PROVIDER_ERROR', httpStatus: 500 }),
      step({
        seq: 2,
        roleKind: 'SYSTEM',
        roleId: null,
        stage: 'GENERATION',
        code: 'REVIEW_NOT_PASSED',
        httpStatus: null,
      }),
    ]);
    expect(result.failure).toMatchObject({
      code: 'REVIEW_NOT_PASSED',
      httpStatus: null,
      roleId: 'author-1',
    });
  });

  it('does not blame a role whose fallback later succeeded', () => {
    const result = buildProgress(job('FAILED'), request, [
      step({ seq: 1, roleId: 'author-1', code: 'PROVIDER_ERROR' }),
      step({ seq: 2, roleId: 'author-1', outcome: 'SUCCEEDED', code: null }),
      step({ seq: 3, roleKind: 'SYSTEM', roleId: null, stage: 'GENERATION', code: 'X' }),
    ]);
    expect(result.failure).toMatchObject({ roleId: null, failedStage: 'AUTHOR_DRAFTS' });
  });

  it('blames the latest unrecovered role when an earlier one recovered', () => {
    const result = buildProgress(job('FAILED'), request, [
      step({ seq: 1, roleId: 'author-1' }),
      step({ seq: 2, roleId: 'author-1', outcome: 'SUCCEEDED', code: null }),
      step({ seq: 3, roleId: 'judge', roleKind: 'JUDGE', stage: 'JUDGE' }),
    ]);
    expect(result.failure).toMatchObject({ roleId: 'judge', failedStage: 'JUDGE' });
  });

  it('marks a revision-review job as not retryable', () => {
    const revision = { ...job('FAILED'), request: { ...request, kind: 'revision-review' } };
    expect(buildProgress(revision, request, []).failure?.retryable).toBe(false);
    expect(
      buildProgress({ ...revision, status: 'CANCELLED' }, request, []).failure?.retryable,
    ).toBe(false);
  });

  it('falls back to the safe error code without steps', () => {
    expect(buildProgress(job('FAILED'), request, []).failure?.code).toBe('GENERATION_FAILED');
  });

  it('reports cancellation and no failure for running or finished jobs', () => {
    expect(buildProgress(job('CANCELLED'), request, []).failure?.code).toBe('CANCELLED');
    expect(buildProgress(job('RUNNING'), request, []).failure).toBeNull();
  });

  it('coerces unknown stored enum values to safe defaults', () => {
    const result = buildProgress(job('RUNNING'), request, [
      step({ outcome: 'weird', roleKind: 'weird' }),
    ]);
    expect(result.steps[0]).toMatchObject({ outcome: 'FAILED', roleKind: 'SYSTEM' });
  });
});

describe('usdToMicroUsd', () => {
  it('converts by decimal formatting', () => {
    expect(usdToMicroUsd(1.5)).toBe('1500000');
    expect(usdToMicroUsd(0.000001)).toBe('1');
    expect(usdToMicroUsd(5)).toBe('5000000');
  });

  it('rejects zero and out-of-range caps', () => {
    expect(() => usdToMicroUsd(0.0000001)).toThrow(BadRequestException);
    expect(() => usdToMicroUsd(1e12)).toThrow(BadRequestException);
  });
});

describe('buildRetryInput', () => {
  const original: EnqueueGenerationDto = {
    ownerId: 'owner-1',
    sourceThreadId: 'thread-1',
    idempotencyKey: 'old-key',
    correlationId: 'old-corr',
    spendCapMicroUsd: '5000000',
    topic: 'The original topic text',
    publicationType: ThreadPublicationType.ARTICLE,
    contentLocale: Locale.EN,
    publicIntentVersion: 'threads-public-v1',
    authors: [role('author-1'), role('author-2'), role('author-3')],
    judge: role('judge'),
    critic: role('critic'),
  };

  it('keeps the pinned request and only swaps the key and correlation', () => {
    const result = buildRetryInput(original, { ownerId: 'owner-1', idempotencyKey: 'new-key' });
    expect(result).toEqual({
      ...original,
      idempotencyKey: 'new-key',
      correlationId: 'retry:new-key',
    });
  });

  it('applies topic, cap and model overrides, dropping fallbacks on the new provider', () => {
    const result = buildRetryInput(original, {
      ownerId: 'owner-1',
      idempotencyKey: 'new-key',
      topic: 'A different topic text',
      spendCapUsd: 2,
      models: [{ roleId: 'judge', provider: 'GEMINI', model: 'gemini-x' }],
    });
    expect(result.topic).toBe('A different topic text');
    expect(result.spendCapMicroUsd).toBe('2000000');
    expect(result.judge).toMatchObject({ provider: 'GEMINI', model: 'gemini-x', fallbacks: [] });
    expect(result.critic).toEqual(original.critic);
  });

  it('rejects a change to an unknown role', () => {
    expect(() =>
      buildRetryInput(original, {
        ownerId: 'owner-1',
        idempotencyKey: 'k',
        models: [{ roleId: 'nope', provider: 'X', model: 'y' }],
      }),
    ).toThrow(BadRequestException);
  });
});

describe('buildProgress spend and terminal reason', () => {
  it('reports the persisted job spend exactly, as a decimal string', () => {
    const spent = { ...job('FAILED'), spentMicroCredits: 11_892n };
    expect(buildProgress(spent, request as never, []).spentMicroCredits).toBe('11892');

    const huge = { ...job('FAILED'), spentMicroCredits: 9_007_199_254_740_993n };
    expect(buildProgress(huge, request as never, []).spentMicroCredits).toBe('9007199254740993');
  });

  it('reports zero only when nothing was recorded', () => {
    const none = { ...job('RUNNING'), spentMicroCredits: 0n };
    expect(buildProgress(none, request as never, []).spentMicroCredits).toBe('0');
  });

  it('shows the primary cause recorded on the final step, not an earlier fallback error', () => {
    const progress = buildProgress(job('FAILED'), request as never, [
      step({ seq: 1, code: 'OUTPUT_INVALID', httpStatus: null, provider: 'GEMINI' }),
      step({ seq: 2, code: 'OUTPUT_INVALID', httpStatus: null, provider: 'OLLAMA' }),
      step({ seq: 3, code: 'CLOUD_PROVIDER_UNAVAILABLE', httpStatus: 400, provider: 'OPENROUTER' }),
      step({
        seq: 4,
        stage: 'GENERATION',
        roleKind: 'SYSTEM',
        roleId: null,
        provider: null,
        model: null,
        code: 'OUTPUT_INVALID',
        httpStatus: null,
        excerpt: 'Every model failed. Main cause: OUTPUT_INVALID (2 of 3).',
      }),
    ]);

    expect(progress.failure?.code).toBe('OUTPUT_INVALID');
    expect(progress.failure?.httpStatus).toBeNull();
    expect(progress.steps.at(-1)?.excerpt).toContain('Main cause: OUTPUT_INVALID');
  });
});
