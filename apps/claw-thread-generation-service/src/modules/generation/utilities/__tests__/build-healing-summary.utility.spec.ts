import {
  ThreadFailureClass,
  ThreadFailurePhase,
  ThreadHealingResult,
  ThreadHealingStrategy,
} from '@claw/shared-types';

import type { StepRow } from '../../types/step-recorder.types';
import { buildHealingSummary } from '../build-healing-summary.utility';
import { suggestModel } from '../suggest-model.utility';

const step = (seq: number, overrides: Partial<StepRow>): StepRow => ({
  seq,
  at: new Date('2026-10-14T10:00:00.000Z'),
  stage: 'AUTHOR_DRAFTS',
  round: 1,
  outcome: 'STARTED',
  roleKind: 'AUTHOR',
  roleId: 'author-1',
  provider: 'OPENROUTER',
  model: 'a',
  code: null,
  httpStatus: null,
  durationMs: null,
  inputTokens: null,
  outputTokens: null,
  excerpt: null,
  ...overrides,
});

describe('buildHealingSummary (ADR-181)', () => {
  it('lists each healing step with its phase, strategy, class, model and result', () => {
    const steps = [
      step(1, { outcome: 'FAILED', code: 'OUTPUT_INVALID' }),
      step(2, {
        outcome: 'RETRY',
        code: ThreadHealingStrategy.STRICT_PROMPT,
        excerpt: ThreadFailureClass.WRONG_SHAPE,
      }),
      step(3, { outcome: 'STARTED' }),
      step(4, { outcome: 'SUCCEEDED' }),
      step(5, {
        outcome: 'FAILED',
        code: 'PROVIDER_ERROR',
        httpStatus: 503,
        roleId: 'judge',
        stage: 'JUDGE',
        roleKind: 'JUDGE',
      }),
      step(6, {
        outcome: 'FALLBACK',
        code: ThreadHealingStrategy.CROSS_PROVIDER,
        excerpt: ThreadFailureClass.PROVIDER_UNAVAILABLE,
        roleId: 'judge',
        stage: 'JUDGE',
        roleKind: 'JUDGE',
        provider: 'GEMINI',
        model: 'flash',
      }),
    ];
    const summary = buildHealingSummary(steps, true);
    expect(summary.attempts).toEqual([
      {
        seq: 2,
        phase: ThreadFailurePhase.AUTHOR,
        roleId: 'author-1',
        strategy: ThreadHealingStrategy.STRICT_PROMPT,
        failureClass: ThreadFailureClass.WRONG_SHAPE,
        provider: 'OPENROUTER',
        model: 'a',
        result: ThreadHealingResult.SUCCEEDED,
      },
      {
        seq: 6,
        phase: ThreadFailurePhase.JUDGE,
        roleId: 'judge',
        strategy: ThreadHealingStrategy.CROSS_PROVIDER,
        failureClass: ThreadFailureClass.PROVIDER_UNAVAILABLE,
        provider: 'GEMINI',
        model: 'flash',
        result: ThreadHealingResult.PENDING,
      },
    ]);
    expect(summary.active).toBe(true);
  });

  it('is not active once the job stopped, and ignores steps that are not healing', () => {
    const summary = buildHealingSummary(
      [
        step(1, { outcome: 'RETRY', code: 'JUDGE_SCORE_LOW' }),
        step(2, { outcome: 'SKIPPED', code: 'FALLBACK_SKIPPED_SAME_PROVIDER' }),
        step(3, { outcome: 'FALLBACK', code: ThreadHealingStrategy.TEAM_FALLBACK }),
      ],
      false,
    );
    expect(summary.attempts).toHaveLength(1);
    expect(summary.attempts[0]?.failureClass).toBe(ThreadFailureClass.UNKNOWN);
    expect(summary.active).toBe(false);
  });

  it('reads an empty log as no attempts', () => {
    expect(buildHealingSummary([], true)).toEqual({ attempts: [], active: false });
  });
});

describe('suggestModel', () => {
  const role = (id: string, fallbacks: Array<{ provider: string; model: string }>) => ({
    id,
    provider: 'OPENROUTER',
    model: 'a',
    maxOutputTokens: 1024,
    fallbacks,
  });
  const request = {
    topic: 't',
    publicationType: 'article',
    contentLocale: 'en',
    authors: [role('author-1', [{ provider: 'OPENROUTER', model: 'b' }])],
    judge: role('judge', []),
    critic: role('critic', []),
    healing: {
      pool: [{ provider: 'GEMINI', model: 'p1' }],
      safeDefault: { provider: 'GEMINI', model: 'flash' },
    },
  };

  it('offers the first backup the role has not failed on', () => {
    expect(suggestModel(request, 'author-1', [])).toEqual({ provider: 'OPENROUTER', model: 'b' });
  });

  it('moves to the pool and then the safe default as models fail', () => {
    const failed = (model: string, provider: string) =>
      step(1, { outcome: 'FAILED', provider, model });
    expect(suggestModel(request, 'author-1', [failed('b', 'OPENROUTER')])).toEqual({
      provider: 'GEMINI',
      model: 'p1',
    });
    expect(
      suggestModel(request, 'author-1', [failed('b', 'OPENROUTER'), failed('p1', 'GEMINI')]),
    ).toEqual({ provider: 'GEMINI', model: 'flash' });
  });

  it('offers nothing for an unknown role or when every option failed', () => {
    expect(suggestModel(request, null, [])).toBeNull();
    expect(suggestModel(request, 'nobody', [])).toBeNull();
    expect(
      suggestModel(request, 'judge', [
        step(1, { roleId: 'judge', outcome: 'FAILED', provider: 'GEMINI', model: 'p1' }),
        step(2, { roleId: 'judge', outcome: 'FAILED', provider: 'GEMINI', model: 'flash' }),
      ]),
    ).toBeNull();
  });
});
