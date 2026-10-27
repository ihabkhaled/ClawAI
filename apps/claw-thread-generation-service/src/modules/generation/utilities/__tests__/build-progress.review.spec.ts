import { ThreadFailureClass, ThreadFailureRemedy, ThreadPublicationType } from '@claw/shared-types';

import {
  type EnqueueGenerationDto,
  enqueueGenerationSchema,
} from '../../dto/enqueue-generation.dto';
import { retryGenerationSchema } from '../../dto/retry-generation.dto';
import type { StepRow } from '../../types/step-recorder.types';
import { buildProgress } from '../build-progress.utility';
import { buildRetryInput } from '../build-retry-input.utility';
import { isSameRequest } from '../same-request.utility';
import { serializeVerdict } from '../review-verdict.utility';

const role = (id: string) => ({
  id,
  provider: 'OPENAI',
  model: 'm',
  maxOutputTokens: 1024,
  fallbacks: [],
});

const request: EnqueueGenerationDto = {
  ownerId: 'owner-1',
  sourceThreadId: 'thread-1',
  idempotencyKey: 'key-1',
  correlationId: 'corr-1',
  spendCapMicroUsd: '5000000',
  publicIntentVersion: 'threads-public-v1',
  topic: 'A detailed topic about reward hacking',
  publicationType: ThreadPublicationType.ARTICLE,
  contentLocale: 'ar' as EnqueueGenerationDto['contentLocale'],
  authors: [role('author-1'), role('author-2'), role('author-3')],
  judge: role('judge'),
  critic: role('critic'),
};

const job = {
  id: 'job-1',
  status: 'FAILED',
  stage: 'JUDGE',
  round: 3,
  attemptCount: 1,
  spentMicroCredits: 12n,
  budgetCloseStatus: null as string | null,
  spendCapMicroUsd: 5_000_000n,
  sourceThreadId: 'thread-1',
  safeErrorCode: 'REVIEW_NOT_PASSED',
  request,
  createdAt: new Date('2026-10-27T10:00:00.000Z'),
  updatedAt: new Date('2026-10-27T10:01:00.000Z'),
};

const step = (overrides: Partial<StepRow>): StepRow => ({
  seq: 1,
  at: new Date('2026-10-27T10:00:30.000Z'),
  stage: 'JUDGE',
  round: 1,
  outcome: 'RETRY',
  roleKind: 'JUDGE',
  roleId: 'judge',
  provider: null,
  model: null,
  code: 'JUDGE_BLOCKED',
  httpStatus: null,
  durationMs: null,
  inputTokens: null,
  outputTokens: null,
  excerpt: null,
  ...overrides,
});

const finalStep = step({
  seq: 20,
  outcome: 'FAILED',
  roleKind: 'SYSTEM',
  roleId: null,
  stage: 'GENERATION',
  code: 'REVIEW_NOT_PASSED',
});

const PRODUCTION_BLOCKERS = [
  'the article does not meet the request to cite independent primary sources on sycophancy and reward hacking; the text admits the gap but must fill it or explicitly narrow the scope',
  'repository files are not in the evidence, so claims about AI-Psychiatry cannot be verified',
];

describe('buildProgress for a failed review (ADR-193)', () => {
  it('carries score, minimum and blockers, and offers research when only sources were missing', () => {
    const progress = buildProgress(job, request, [
      step({ seq: 5, excerpt: serializeVerdict({ score: 82, blockers: PRODUCTION_BLOCKERS }, 80) }),
      finalStep,
    ]);

    expect(progress.failure).toMatchObject({
      code: 'REVIEW_NOT_PASSED',
      failureClass: ThreadFailureClass.EVIDENCE_GAP,
      remedies: [
        ThreadFailureRemedy.RESEARCH_MORE,
        ThreadFailureRemedy.NARROW_CLAIMS,
        ThreadFailureRemedy.ACCEPT_GAPS,
      ],
      retryable: true,
      review: {
        reviewer: 'JUDGE',
        score: 82,
        minScore: 80,
        blockers: PRODUCTION_BLOCKERS,
        blocked: true,
        evidenceGapBlockers: PRODUCTION_BLOCKERS,
      },
    });
  });

  it('keeps REVIEW_NOT_PASSED when a blocker is not about sources', () => {
    const progress = buildProgress(job, request, [
      step({
        seq: 5,
        excerpt: serializeVerdict(
          {
            score: 84,
            blockers: [...PRODUCTION_BLOCKERS, 'The conclusion contradicts the intro.'],
          },
          80,
        ),
      }),
      finalStep,
    ]);

    expect(progress.failure?.failureClass).toBe(ThreadFailureClass.REVIEW_NOT_PASSED);
    expect(progress.failure?.remedies).not.toContain(ThreadFailureRemedy.RESEARCH_MORE);
    // The sourcing blockers can still be accepted; the contradiction cannot.
    expect(progress.failure?.remedies).toContain(ThreadFailureRemedy.ACCEPT_GAPS);
    expect(progress.failure?.review?.evidenceGapBlockers).toEqual(PRODUCTION_BLOCKERS);
    expect(progress.failure?.review?.blocked).toBe(true);
  });

  it('keeps a really low score a low score', () => {
    const progress = buildProgress(job, request, [
      step({
        seq: 5,
        code: 'JUDGE_SCORE_LOW',
        excerpt: serializeVerdict({ score: 55, blockers: [] }, 80),
      }),
      finalStep,
    ]);

    expect(progress.failure?.failureClass).toBe(ThreadFailureClass.REVIEW_NOT_PASSED);
    expect(progress.failure?.review).toMatchObject({ score: 55, minScore: 80, blocked: false });
    expect(progress.failure?.remedies).not.toContain(ThreadFailureRemedy.ACCEPT_GAPS);
  });

  it('adds no review to a job from before verdicts were recorded', () => {
    const progress = buildProgress(job, request, [
      step({ seq: 5, code: 'JUDGE_SCORE_LOW', excerpt: '{"revisionBrief":"x","blockers":[]}' }),
      finalStep,
    ]);

    expect(progress.failure).not.toHaveProperty('review');
    expect(progress.failure?.failureClass).toBe(ThreadFailureClass.REVIEW_NOT_PASSED);
  });

  it('adds no review to a failure that is not a review failure', () => {
    const progress = buildProgress(job, request, [
      step({ seq: 5, excerpt: serializeVerdict({ score: 82, blockers: PRODUCTION_BLOCKERS }, 80) }),
      step({
        seq: 6,
        outcome: 'FAILED',
        roleKind: 'AUTHOR',
        roleId: 'author-1',
        stage: 'AUTHOR_DRAFTS',
        code: 'PAYG_CREDIT_EXHAUSTED',
        httpStatus: 402,
      }),
    ]);

    expect(progress.failure).not.toHaveProperty('review');
    expect(progress.failure?.failureClass).toBe(ThreadFailureClass.CREDIT_EXHAUSTED);
  });
});

describe('refreshResearch on a retry (ADR-193)', () => {
  it('is part of the request and of its comparison', () => {
    const plain = buildRetryInput(
      request,
      retryGenerationSchema.parse({
        ownerId: 'owner-1',
        idempotencyKey: 'retry-1',
      }),
    );
    const refreshed = buildRetryInput(
      request,
      retryGenerationSchema.parse({
        ownerId: 'owner-1',
        idempotencyKey: 'retry-1',
        refreshResearch: true,
      }),
    );

    expect(plain).not.toHaveProperty('refreshResearch');
    expect(refreshed.refreshResearch).toBe(true);
    expect(enqueueGenerationSchema.safeParse(refreshed).success).toBe(true);
    expect(isSameRequest(plain, refreshed)).toBe(false);
    expect(isSameRequest(refreshed, { ...refreshed })).toBe(true);
    expect(isSameRequest(plain, { ...plain })).toBe(true);
  });

  it('is not inherited by the retry of a retry', () => {
    const refreshed = { ...request, refreshResearch: true };
    const next = buildRetryInput(
      refreshed,
      retryGenerationSchema.parse({ ownerId: 'owner-1', idempotencyKey: 'retry-2' }),
    );

    expect(next).not.toHaveProperty('refreshResearch');
  });

  it('must be a boolean', () => {
    expect(
      retryGenerationSchema.safeParse({
        ownerId: 'owner-1',
        idempotencyKey: 'k',
        refreshResearch: 'yes',
      }).success,
    ).toBe(false);
  });
});

describe('acceptedEvidenceGaps on a retry (ADR-194)', () => {
  const owner = { ownerId: 'owner-1', idempotencyKey: 'retry-1' };
  const GAP = 'does not cite primary sources for sycophancy';

  it('is stored normalised and is part of the request comparison', () => {
    const plain = buildRetryInput(request, retryGenerationSchema.parse(owner));
    const accepted = buildRetryInput(
      request,
      retryGenerationSchema.parse({ ...owner, acceptedEvidenceGaps: ['  b gap ', GAP, GAP] }),
    );
    const reordered = buildRetryInput(
      request,
      retryGenerationSchema.parse({ ...owner, acceptedEvidenceGaps: [GAP, 'b gap'] }),
    );

    expect(plain).not.toHaveProperty('acceptedEvidenceGaps');
    expect(accepted.acceptedEvidenceGaps).toEqual(['b gap', GAP].sort());
    expect(enqueueGenerationSchema.safeParse(accepted).success).toBe(true);
    expect(isSameRequest(plain, accepted)).toBe(false);
    expect(isSameRequest(accepted, reordered)).toBe(true);
  });

  it('an empty list is the same request as none', () => {
    const none = buildRetryInput(request, retryGenerationSchema.parse(owner));
    const empty = buildRetryInput(
      request,
      retryGenerationSchema.parse({ ...owner, acceptedEvidenceGaps: [] }),
    );

    expect(empty).not.toHaveProperty('acceptedEvidenceGaps');
    expect(isSameRequest(none, empty)).toBe(true);
  });

  it('is not inherited by the retry of a retry', () => {
    const accepted = { ...request, acceptedEvidenceGaps: [GAP] };
    const next = buildRetryInput(accepted, retryGenerationSchema.parse(owner));

    expect(next).not.toHaveProperty('acceptedEvidenceGaps');
  });

  it('rejects more than 8 entries, an entry over 300 characters, blanks and non-strings', () => {
    const parse = (value: unknown) =>
      retryGenerationSchema.safeParse({ ...owner, acceptedEvidenceGaps: value }).success;

    expect(parse(Array.from({ length: 8 }, (_, i) => `gap ${String(i)}`))).toBe(true);
    expect(parse(Array.from({ length: 9 }, (_, i) => `gap ${String(i)}`))).toBe(false);
    expect(parse(['x'.repeat(300)])).toBe(true);
    expect(parse(['x'.repeat(301)])).toBe(false);
    expect(parse(['   '])).toBe(false);
    expect(parse([42])).toBe(false);
    expect(parse('gap')).toBe(false);
  });
});
