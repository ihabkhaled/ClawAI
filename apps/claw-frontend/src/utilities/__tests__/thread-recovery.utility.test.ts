import {
  ThreadArticleLength,
  ThreadFailureClass,
  ThreadFailurePhase,
  ThreadFailureRemedy,
  ThreadHealingResult,
  ThreadHealingStrategy,
  type ThreadGenerationFailure,
  type ThreadGenerationHealing,
} from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import { makeProgress } from '@/components/threads/__tests__/thread-progress.fixture';
import {
  THREAD_CLASS_REASON_KEYS,
  THREAD_PHASE_KEYS,
  THREAD_REMEDY_LABEL_KEYS,
} from '@/constants/thread-recovery.constants';

import {
  buildRecoveryActions,
  buildRecoveryRetryRequest,
  healingNoticeKey,
  viewHealingAttempts,
} from '../thread-recovery.utility';

const failure = (overrides: Partial<ThreadGenerationFailure> = {}): ThreadGenerationFailure => ({
  code: 'OUTPUT_INVALID',
  failedStage: 'AUTHOR_DRAFTS',
  roleId: 'author-1',
  httpStatus: null,
  retryable: true,
  phase: ThreadFailurePhase.AUTHOR,
  failureClass: ThreadFailureClass.WRONG_SHAPE,
  remedies: [
    ThreadFailureRemedy.TRY_SUGGESTED_MODEL,
    ThreadFailureRemedy.CHOOSE_ANOTHER_MODEL,
    ThreadFailureRemedy.USE_RECOMMENDED_TEAM,
    ThreadFailureRemedy.TRY_AGAIN,
  ],
  suggestedModel: { provider: 'GEMINI', model: 'flash' },
  ...overrides,
});

const attempt = (strategy: ThreadHealingStrategy, active = true): ThreadGenerationHealing => ({
  active,
  attempts: [
    {
      seq: 3,
      phase: ThreadFailurePhase.AUTHOR,
      roleId: 'author-1',
      strategy,
      failureClass: ThreadFailureClass.WRONG_SHAPE,
      provider: 'OPENROUTER',
      model: 'a',
      result: ThreadHealingResult.PENDING,
    },
  ],
});

describe('every enum value has a translation key (ADR-181)', () => {
  it('covers every phase, class and remedy', () => {
    for (const phase of Object.values(ThreadFailurePhase)) {
      expect(THREAD_PHASE_KEYS[phase]).toBeTruthy();
    }
    for (const value of Object.values(ThreadFailureClass)) {
      expect(THREAD_CLASS_REASON_KEYS[value]).toBeTruthy();
    }
    for (const remedy of Object.values(ThreadFailureRemedy)) {
      expect(THREAD_REMEDY_LABEL_KEYS[remedy]).toBeTruthy();
    }
  });
});

describe('buildRecoveryActions', () => {
  it('shows at most three, carries the suggested model name, and marks one-click remedies', () => {
    const actions = buildRecoveryActions(failure());
    expect(actions.map(({ remedy }) => remedy)).toEqual([
      ThreadFailureRemedy.TRY_SUGGESTED_MODEL,
      ThreadFailureRemedy.CHOOSE_ANOTHER_MODEL,
      ThreadFailureRemedy.USE_RECOMMENDED_TEAM,
    ]);
    expect(actions[0]?.params).toEqual({ model: 'GEMINI / flash' });
    expect(actions.map(({ oneClick }) => oneClick)).toEqual([true, false, true]);
  });

  it('drops the suggested-model button when there is no suggestion and the add-credit one is not a request', () => {
    expect(
      buildRecoveryActions(failure({ suggestedModel: null })).map(({ remedy }) => remedy),
    ).not.toContain(ThreadFailureRemedy.TRY_SUGGESTED_MODEL);
    const credit = buildRecoveryActions(failure({ remedies: [ThreadFailureRemedy.ADD_CREDIT] }));
    expect(credit[0]?.oneClick).toBe(false);
  });

  it('shows nothing for a failure from an older service', () => {
    expect(buildRecoveryActions(failure({ remedies: undefined }))).toEqual([]);
  });
});

describe('buildRecoveryRetryRequest', () => {
  const progress = makeProgress({ failure: failure() });
  const base = { progress, idempotencyKey: 'k' };

  it('retries with nothing changed for Try again', () => {
    expect(
      buildRecoveryRetryRequest({ ...base, remedy: ThreadFailureRemedy.TRY_AGAIN, team: null }),
    ).toEqual({
      idempotencyKey: 'k',
    });
  });

  it('changes only the failed role for the suggested model', () => {
    expect(
      buildRecoveryRetryRequest({
        ...base,
        remedy: ThreadFailureRemedy.TRY_SUGGESTED_MODEL,
        team: null,
      }),
    ).toEqual({
      idempotencyKey: 'k',
      models: [{ roleId: 'author-1', provider: 'GEMINI', model: 'flash' }],
    });
  });

  it('asks for the shorter article', () => {
    expect(
      buildRecoveryRetryRequest({
        ...base,
        remedy: ThreadFailureRemedy.SHORTER_ARTICLE,
        team: null,
      }),
    ).toEqual({ idempotencyKey: 'k', articleLength: ThreadArticleLength.SHORT });
  });

  it('maps the recommended team onto the job roles by kind and position', () => {
    const team = {
      authors: [{ provider: 'GROK', model: 'a1', fallbacks: [] }],
      judge: { provider: 'GEMINI', model: 'j', fallbacks: [] },
      critic: { provider: 'NVIDIA', model: 'c', fallbacks: [] },
    };
    expect(
      buildRecoveryRetryRequest({
        ...base,
        remedy: ThreadFailureRemedy.USE_RECOMMENDED_TEAM,
        team,
      }),
    ).toEqual({
      idempotencyKey: 'k',
      models: [
        { roleId: 'author-1', provider: 'GROK', model: 'a1' },
        { roleId: 'judge', provider: 'GEMINI', model: 'j' },
        { roleId: 'critic', provider: 'NVIDIA', model: 'c' },
      ],
    });
  });

  it('cannot build a request without a team, a suggestion or a role, and form remedies send nothing', () => {
    expect(
      buildRecoveryRetryRequest({
        ...base,
        remedy: ThreadFailureRemedy.USE_RECOMMENDED_TEAM,
        team: null,
      }),
    ).toBeNull();
    const none = makeProgress({ failure: failure({ suggestedModel: null }) });
    expect(
      buildRecoveryRetryRequest({
        progress: none,
        idempotencyKey: 'k',
        remedy: ThreadFailureRemedy.TRY_SUGGESTED_MODEL,
        team: null,
      }),
    ).toBeNull();
    for (const remedy of [
      ThreadFailureRemedy.CHOOSE_ANOTHER_MODEL,
      ThreadFailureRemedy.RAISE_SPEND_CAP,
      ThreadFailureRemedy.ADD_CREDIT,
      ThreadFailureRemedy.CHANGE_TOPIC,
    ]) {
      expect(buildRecoveryRetryRequest({ ...base, remedy, team: null })).toBeNull();
    }
  });
});

describe('healing display helpers', () => {
  it('says "different model" for a swap and "smarter way" for any other healing step', () => {
    expect(healingNoticeKey(attempt(ThreadHealingStrategy.CROSS_PROVIDER))).toBe(
      'chat.threadProgress.recovery.retryingModel',
    );
    expect(healingNoticeKey(attempt(ThreadHealingStrategy.STRICT_PROMPT))).toBe(
      'chat.threadProgress.recovery.retryingSmarter',
    );
  });

  it('says nothing when healing is not active or absent', () => {
    expect(healingNoticeKey(attempt(ThreadHealingStrategy.STRICT_PROMPT, false))).toBeNull();
    expect(healingNoticeKey(undefined)).toBeNull();
    expect(healingNoticeKey({ active: true, attempts: [] })).toBeNull();
  });

  it('lists attempts with their wording and model', () => {
    const [view] = viewHealingAttempts(attempt(ThreadHealingStrategy.JSON_REPAIR));
    expect(view?.messageKey).toBe('chat.threadProgress.code.healJsonRepair');
    expect(view?.model).toBe('OPENROUTER / a');
    expect(viewHealingAttempts(undefined)).toEqual([]);
  });
});
