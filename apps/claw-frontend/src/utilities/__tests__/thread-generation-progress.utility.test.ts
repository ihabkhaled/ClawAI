import { describe, expect, it } from 'vitest';

import { makeProgress, makeStep } from '@/components/threads/__tests__/thread-progress.fixture';
import { THREAD_EXCERPT_MAX_CHARS } from '@/constants/thread-generation-progress.constants';

import {
  readAllowanceRefunded,
  readIncludedUsageTokens,
  readThreadSpentMicro,
  buildThreadRetryRequest,
  findFailedRoleKind,
  formatMicroUsd,
  describeStepDuration,
  formatStepTime,
  hasThreadSpend,
  isQueuedThreadStatus,
  isRetryableThreadStatus,
  isTerminalThreadStatus,
  isScrolledToBottom,
  threadProgressSignature,
  microUsdToInputValue,
  resolveThreadFailureKeys,
  threadRoleLabelKey,
  threadHeadlineKey,
  threadStatusLabelKey,
  toThreadRetryRoleSelections,
  truncateExcerpt,
} from '../thread-generation-progress.utility';

describe('status helpers', () => {
  it('knows terminal and retryable statuses', () => {
    expect(isTerminalThreadStatus('COMPLETED')).toBe(true);
    expect(isTerminalThreadStatus('FAILED')).toBe(true);
    expect(isTerminalThreadStatus('WAITING_FOR_REVIEW')).toBe(true);
    expect(isTerminalThreadStatus('RUNNING')).toBe(false);
    expect(isRetryableThreadStatus('CANCELLED')).toBe(true);
    expect(isRetryableThreadStatus('WAITING_FOR_REVIEW')).toBe(false);
  });

  it('labels terminal statuses and leaves running ones to the stage label', () => {
    expect(threadStatusLabelKey('FAILED')).toBe('chat.threadProgress.outcomeFailed');
    expect(threadStatusLabelKey('RUNNING')).toBeNull();
  });

  it('maps a role kind to its label key', () => {
    expect(threadRoleLabelKey('JUDGE')).toBe('chat.threadProgress.roleJudge');
  });
});

describe('describeStepDuration', () => {
  it('describes milliseconds, seconds and minutes with translatable units', () => {
    expect(describeStepDuration(850)).toEqual({
      key: 'chat.threadProgress.durationUnit.ms',
      params: { value: '850' },
    });
    expect(describeStepDuration(1500)).toEqual({
      key: 'chat.threadProgress.durationUnit.s',
      params: { value: '1.5' },
    });
    expect(describeStepDuration(125_000)).toEqual({
      key: 'chat.threadProgress.durationUnit.minSec',
      params: { minutes: '2', seconds: '5' },
    });
  });

  it('rolls a near-minute duration over to the minutes form instead of 60 seconds', () => {
    expect(describeStepDuration(119_600)).toEqual({
      key: 'chat.threadProgress.durationUnit.minSec',
      params: { minutes: '2', seconds: '0' },
    });
    expect(describeStepDuration(59_960)).toEqual({
      key: 'chat.threadProgress.durationUnit.minSec',
      params: { minutes: '1', seconds: '0' },
    });
  });

  it('keeps one-decimal seconds below the rounded minute', () => {
    expect(describeStepDuration(400).key).toBe('chat.threadProgress.durationUnit.ms');
    expect(describeStepDuration(59_400)).toEqual({
      key: 'chat.threadProgress.durationUnit.s',
      params: { value: '59.4' },
    });
  });

  it('never goes negative', () => {
    expect(describeStepDuration(-5).params).toEqual({ value: '0' });
  });
});

describe('money helpers', () => {
  it('formats micro-USD, keeping at least cents', () => {
    expect(formatMicroUsd('12300')).toBe('$0.0123');
    expect(formatMicroUsd('1000000')).toBe('$1.00');
    expect(formatMicroUsd('1500000')).toBe('$1.50');
  });

  it('survives bad input', () => {
    expect(formatMicroUsd('nope')).toBe('$0.00');
  });

  it('turns micro-USD into an input value', () => {
    expect(microUsdToInputValue('2500000')).toBe('2.5');
    expect(microUsdToInputValue('0')).toBe('');
    expect(microUsdToInputValue('bad')).toBe('');
  });
});

describe('formatStepTime', () => {
  it('formats a valid timestamp and returns an invalid one untouched', () => {
    expect(formatStepTime('2026-10-13T10:00:00.000Z')).not.toBe('2026-10-13T10:00:00.000Z');
    expect(formatStepTime('not a date')).toBe('not a date');
  });
});

describe('truncateExcerpt', () => {
  it('keeps short text and bounds long text', () => {
    expect(truncateExcerpt('short')).toBe('short');
    const long = 'x'.repeat(THREAD_EXCERPT_MAX_CHARS + 50);
    expect(truncateExcerpt(long)).toHaveLength(THREAD_EXCERPT_MAX_CHARS + 1);
    expect(truncateExcerpt(long).endsWith('…')).toBe(true);
  });
});

describe('resolveThreadFailureKeys', () => {
  it('resolves a known code', () => {
    expect(resolveThreadFailureKeys('PAYG_CREDIT_EXHAUSTED')).toEqual({
      messageKey: 'chat.threadProgress.code.paygCreditExhausted',
      hintKey: 'chat.threadProgress.hint.paygCreditExhausted',
      params: { code: 'PAYG_CREDIT_EXHAUSTED' },
    });
  });

  it('falls back for an unknown code and keeps the code for display', () => {
    expect(resolveThreadFailureKeys('WEIRD')).toEqual({
      messageKey: 'chat.threadProgress.code.unknown',
      hintKey: 'chat.threadProgress.hint.unknown',
      params: { code: 'WEIRD' },
    });
  });
});

describe('findFailedRoleKind', () => {
  it('finds the kind of the failed role', () => {
    expect(findFailedRoleKind(makeProgress())).toBe('AUTHOR');
  });

  it('is null without a failure, without a role id, or for an unknown role', () => {
    expect(findFailedRoleKind(makeProgress({ failure: null }))).toBeNull();
    const base = makeProgress();
    const failure = base.failure;
    expect(
      findFailedRoleKind({ ...base, failure: failure && { ...failure, roleId: null } }),
    ).toBeNull();
    expect(
      findFailedRoleKind({ ...base, failure: failure && { ...failure, roleId: 'ghost' } }),
    ).toBeNull();
  });
});

describe('buildThreadRetryRequest', () => {
  const progress = makeProgress();
  const roles = progress.selections.roles.map(({ roleId, roleKind, provider, model }) => ({
    roleId,
    roleKind,
    model: { provider, model, displayName: model },
  }));

  it('sends only the idempotency key when nothing changed', () => {
    expect(
      buildThreadRetryRequest({
        progress,
        idempotencyKey: 'key-1',
        topic: ' How heat pumps work ',
        spendCapUsd: '1',
        roles,
      }),
    ).toEqual({ idempotencyKey: 'key-1' });
  });

  it('sends the changed topic, cap and models only', () => {
    const changedRoles = roles.map((role) =>
      role.roleId === 'author-1'
        ? { ...role, model: { provider: 'OLLAMA', model: 'oll-z', displayName: 'Oll' } }
        : role,
    );
    expect(
      buildThreadRetryRequest({
        progress,
        idempotencyKey: 'key-2',
        topic: 'A new angle on heat pumps',
        spendCapUsd: '2.5',
        roles: changedRoles,
      }),
    ).toEqual({
      idempotencyKey: 'key-2',
      topic: 'A new angle on heat pumps',
      spendCapUsd: 2.5,
      models: [{ roleId: 'author-1', provider: 'OLLAMA', model: 'oll-z' }],
    });
  });

  it('ignores an empty topic and an unusable cap', () => {
    expect(
      buildThreadRetryRequest({
        progress,
        idempotencyKey: 'key-3',
        topic: '   ',
        spendCapUsd: '-4',
        roles: [],
      }),
    ).toEqual({ idempotencyKey: 'key-3' });
  });
});

describe('toThreadRetryRoleSelections', () => {
  it('lists the editable roles with the model the failed job used', () => {
    const roles = toThreadRetryRoleSelections(makeProgress());
    expect(roles.map((role) => role.roleId)).toEqual(['author-1', 'judge', 'critic']);
    expect(roles[0]?.model).toEqual({ provider: 'OPENAI', model: 'gpt-x', displayName: 'gpt-x' });
  });

  it('skips research and system roles and copes with no progress', () => {
    const base = makeProgress();
    const withSystem = {
      ...base,
      selections: {
        ...base.selections,
        roles: [
          ...base.selections.roles,
          { roleId: 'sys', roleKind: 'SYSTEM' as const, provider: 'X', model: 'y', fallbacks: [] },
        ],
      },
    };
    expect(toThreadRetryRoleSelections(withSystem).map((role) => role.roleId)).not.toContain('sys');
    expect(toThreadRetryRoleSelections(undefined)).toEqual([]);
  });
});

describe('threadHeadlineKey', () => {
  it('prefers a terminal status, then the stage, then null', () => {
    expect(threadHeadlineKey('FAILED', 'RESEARCH')).toBe('chat.threadProgress.outcomeFailed');
    expect(threadHeadlineKey('RUNNING', 'RESEARCH')).toBe('chat.threadStageResearch');
    expect(threadHeadlineKey('RUNNING', 'MYSTERY')).toBeNull();
  });
});

describe('queued jobs and unknown spend', () => {
  it('recognises a queued job, and only that', () => {
    expect(isQueuedThreadStatus('QUEUED')).toBe(true);
    expect(isQueuedThreadStatus('RUNNING')).toBe(false);
    expect(isQueuedThreadStatus('queued')).toBe(false);
  });

  it('words a queued job as waiting, never by the stage it has not reached', () => {
    expect(threadHeadlineKey('QUEUED', 'SNAPSHOT')).toBe('chat.threadProgress.statusQueued');
    expect(threadHeadlineKey('RUNNING', 'SNAPSHOT')).toBe('chat.threadStageSnapshot');
  });

  it('counts only a positive, readable amount as spend', () => {
    expect(hasThreadSpend('12300')).toBe(true);
    expect(hasThreadSpend('1')).toBe(true);
    expect(hasThreadSpend('0')).toBe(false);
    expect(hasThreadSpend('')).toBe(false);
    expect(hasThreadSpend('-5')).toBe(false);
    expect(hasThreadSpend('abc')).toBe(false);
    expect(hasThreadSpend('Infinity')).toBe(false);
  });

  it('reads allowanceRefunded only when it is a real true', () => {
    const base = makeProgress();
    expect(readAllowanceRefunded(base)).toBe(false);
    expect(readAllowanceRefunded({ ...base, allowanceRefunded: true } as typeof base)).toBe(true);
    expect(
      readAllowanceRefunded({ ...base, allowanceRefunded: 'true' } as unknown as typeof base),
    ).toBe(false);
  });

  it('shows the larger of the paid spend and the Free meter spend, "0" when unknown', () => {
    const base = makeProgress({ spentMicroCredits: '0' });
    expect(readThreadSpentMicro(base)).toBe('0');
    expect(readThreadSpentMicro({ ...base, freeAllowanceMicroUsd: '4500' } as typeof base)).toBe(
      '4500',
    );
    expect(readThreadSpentMicro({ ...base, freeAllowanceMicroUsd: 'junk' } as typeof base)).toBe(
      '0',
    );
    expect(
      readThreadSpentMicro({
        ...base,
        spentMicroCredits: '12300',
        freeAllowanceMicroUsd: 4500,
      } as typeof base),
    ).toBe('12300');
  });
});

describe('readIncludedUsageTokens', () => {
  it('sums input and output tokens of successful calls', () => {
    const steps = [makeStep(), makeStep({ seq: 2, inputTokens: 10, outputTokens: null })];
    expect(readIncludedUsageTokens(makeProgress({ steps }))).toBe(610);
  });

  it('is 0 when successful calls carry no counts', () => {
    const steps = [makeStep({ inputTokens: null, outputTokens: null })];
    expect(readIncludedUsageTokens(makeProgress({ steps }))).toBe(0);
  });

  it('is null when no call succeeded', () => {
    const steps = [makeStep({ outcome: 'FAILED' }), makeStep({ provider: null })];
    expect(readIncludedUsageTokens(makeProgress({ steps }))).toBeNull();
  });
});

describe('follow-the-bottom helpers', () => {
  it('is at the bottom only within the margin of the scroll area end', () => {
    expect(isScrolledToBottom(2000, 1200, 800, 24)).toBe(true);
    expect(isScrolledToBottom(2000, 1180, 800, 24)).toBe(true);
    expect(isScrolledToBottom(2000, 1100, 800, 24)).toBe(false);
  });

  it('changes the signature when a step arrives or the status moves, and not otherwise', () => {
    const one = makeProgress({ status: 'RUNNING', steps: [makeStep({ seq: 1 })] });
    const same = makeProgress({ status: 'RUNNING', steps: [makeStep({ seq: 1 })] });
    const more = makeProgress({
      status: 'RUNNING',
      steps: [makeStep({ seq: 1 }), makeStep({ seq: 2 })],
    });
    const done = makeProgress({ status: 'COMPLETED', steps: [makeStep({ seq: 1 })] });
    expect(threadProgressSignature(same)).toBe(threadProgressSignature(one));
    expect(threadProgressSignature(more)).not.toBe(threadProgressSignature(one));
    expect(threadProgressSignature(done)).not.toBe(threadProgressSignature(one));
    expect(threadProgressSignature(undefined)).toBe('');
  });
});
