import { ThreadFailureRemedy } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import { makeProgress } from '@/components/threads/__tests__/thread-progress.fixture';
import { THREAD_REMEDY_LABEL_KEYS } from '@/constants/thread-recovery.constants';
import {
  normalizeAcceptedGaps,
  splitThreadGapExcerpt,
  threadGapChoices,
} from '@/utilities/thread-accepted-gaps.utility';
import { buildThreadRetryRequest } from '@/utilities/thread-generation-progress.utility';
import {
  buildRecoveryActions,
  buildRecoveryRetryRequest,
} from '@/utilities/thread-recovery.utility';

describe('normalizeAcceptedGaps', () => {
  it('trims, drops blanks and repeats and keeps the order', () => {
    expect(normalizeAcceptedGaps(['  b ', 'a', 'b', '   ', ''])).toEqual(['b', 'a']);
    expect(normalizeAcceptedGaps(undefined)).toEqual([]);
  });

  it('keeps at most 8 entries of at most 300 characters', () => {
    expect(
      normalizeAcceptedGaps(Array.from({ length: 12 }, (_, i) => `gap ${String(i)}`)),
    ).toHaveLength(8);
    const [long] = normalizeAcceptedGaps(['ص'.repeat(500)]);
    expect([...(long ?? '')]).toHaveLength(300);
  });
});

describe('threadGapChoices', () => {
  it('reads the sourcing blockers the service named, nothing else', () => {
    const progress = makeProgress({
      failure: {
        code: 'REVIEW_NOT_PASSED',
        failedStage: 'JUDGE',
        roleId: null,
        httpStatus: null,
        retryable: true,
        review: {
          reviewer: 'JUDGE',
          score: 84,
          minScore: 80,
          blockers: ['a gap', 'a contradiction'],
          blocked: true,
          evidenceGapBlockers: ['a gap'],
        },
      },
    });

    expect(threadGapChoices(progress)).toEqual(['a gap']);
    expect(threadGapChoices(undefined)).toEqual([]);
    expect(threadGapChoices(makeProgress())).toEqual([]);
  });
});

describe('splitThreadGapExcerpt', () => {
  it('splits the service list into one gap per line', () => {
    expect(splitThreadGapExcerpt('one | two words |  | 三')).toEqual(['one', 'two words', '三']);
    expect(splitThreadGapExcerpt(null)).toEqual([]);
  });
});

describe('the retry request for accepted gaps', () => {
  const base = {
    progress: makeProgress(),
    idempotencyKey: 'k',
    topic: '',
    spendCapUsd: '',
    roles: [],
  };

  it('adds acceptedEvidenceGaps only when something is ticked', () => {
    expect(buildThreadRetryRequest(base)).toEqual({ idempotencyKey: 'k' });
    expect(buildThreadRetryRequest({ ...base, acceptedEvidenceGaps: [] })).toEqual({
      idempotencyKey: 'k',
    });
    expect(buildThreadRetryRequest({ ...base, acceptedEvidenceGaps: [' gap one '] })).toEqual({
      idempotencyKey: 'k',
      acceptedEvidenceGaps: ['gap one'],
    });
  });

  it('is not a one-click remedy: it opens the dialog so the owner ticks the gaps', () => {
    const [accept] = buildRecoveryActions({
      code: 'REVIEW_NOT_PASSED',
      failedStage: 'JUDGE',
      roleId: null,
      httpStatus: null,
      retryable: true,
      remedies: [ThreadFailureRemedy.ACCEPT_GAPS],
    });

    expect(accept?.labelKey).toBe('chat.threadGapsRemedyAccept');
    expect(accept?.labelKey).toBe(THREAD_REMEDY_LABEL_KEYS[ThreadFailureRemedy.ACCEPT_GAPS]);
    expect(accept?.oneClick).toBe(false);
    expect(
      buildRecoveryRetryRequest({
        remedy: ThreadFailureRemedy.ACCEPT_GAPS,
        progress: makeProgress(),
        idempotencyKey: 'k',
        team: null,
      }),
    ).toBeNull();
  });

  it('puts Accept gaps third, ahead of a model change, within the three buttons shown', () => {
    const actions = buildRecoveryActions({
      code: 'REVIEW_NOT_PASSED',
      failedStage: 'JUDGE',
      roleId: null,
      httpStatus: null,
      retryable: true,
      remedies: [
        ThreadFailureRemedy.RESEARCH_MORE,
        ThreadFailureRemedy.NARROW_CLAIMS,
        ThreadFailureRemedy.ACCEPT_GAPS,
        ThreadFailureRemedy.TRY_SUGGESTED_MODEL,
      ],
      suggestedModel: { provider: 'OPENAI', model: 'gpt-x' },
    });

    expect(actions.map(({ remedy }) => remedy)).toEqual([
      ThreadFailureRemedy.RESEARCH_MORE,
      ThreadFailureRemedy.NARROW_CLAIMS,
      ThreadFailureRemedy.ACCEPT_GAPS,
    ]);
  });
});
