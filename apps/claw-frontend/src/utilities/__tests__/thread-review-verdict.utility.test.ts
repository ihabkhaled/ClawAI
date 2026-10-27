import { ThreadFailureClass, ThreadFailureRemedy } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import { makeProgress } from '@/components/threads/__tests__/thread-progress.fixture';
import { THREAD_CLASS_REASON_KEYS } from '@/constants/thread-recovery.constants';

import {
  buildThreadRetryRequest,
  resolveThreadFailureKeys,
} from '../thread-generation-progress.utility';
import { buildRecoveryActions, buildRecoveryRetryRequest } from '../thread-recovery.utility';
import {
  isThreadEvidenceCode,
  isThreadReviewVerdictCode,
  parseThreadReviewVerdict,
  resolveThreadEvidenceKeys,
  threadFailureReasonKey,
} from '../thread-review-verdict.utility';

describe('parseThreadReviewVerdict', () => {
  it('reads score, minimum and blockers', () => {
    expect(parseThreadReviewVerdict('{"score":84,"minScore":80,"blockers":["a","b"]}')).toEqual({
      score: 84,
      minScore: 80,
      blockers: ['a', 'b'],
    });
  });

  it.each([
    null,
    '',
    'plain text',
    '{"score":"x"}',
    '{"score":1,"minScore":2,"blockers":[1]}',
    '[]',
  ])('is null for %j', (excerpt) => {
    expect(parseThreadReviewVerdict(excerpt)).toBeNull();
  });
});

describe('evidence step codes', () => {
  it('knows the blocked-review and research codes only', () => {
    expect(isThreadEvidenceCode('JUDGE_BLOCKED')).toBe(true);
    expect(isThreadEvidenceCode('EVIDENCE_GAP_RESEARCH_SPEND_CAP')).toBe(true);
    expect(isThreadEvidenceCode('JUDGE_SCORE_LOW')).toBe(false);
    expect(isThreadReviewVerdictCode('CRITIC_SCORE_LOW')).toBe(true);
    expect(isThreadReviewVerdictCode('EVIDENCE_GAP_RESEARCH')).toBe(false);
    expect(isThreadReviewVerdictCode(null)).toBe(false);
  });

  it('puts the number of new sources into the message', () => {
    const keys = resolveThreadEvidenceKeys('EVIDENCE_GAP_RESEARCH_DONE', '{"added":4}');
    expect(keys?.messageKey).toBe('chat.threadEvidenceStepFound');
    expect(keys?.params.count).toBe('4');
    expect(resolveThreadEvidenceKeys('EVIDENCE_GAP_RESEARCH_DONE', 'oops')?.params.count).toBe('0');
    expect(resolveThreadEvidenceKeys('PROVIDER_ERROR', null)).toBeNull();
  });

  it('is what resolveThreadFailureKeys returns for those codes and leaves the old codes alone', () => {
    expect(resolveThreadFailureKeys('JUDGE_BLOCKED').messageKey).toBe(
      'chat.threadEvidenceStepBlocked',
    );
    expect(resolveThreadFailureKeys('JUDGE_SCORE_LOW').messageKey).toBe(
      'chat.threadProgress.code.judgeScoreLow',
    );
  });
});

describe('threadFailureReasonKey', () => {
  const base = {
    code: 'REVIEW_NOT_PASSED',
    failedStage: 'JUDGE',
    roleId: null,
    httpStatus: null,
    retryable: true,
  };

  it('names a review blocked by a requirement', () => {
    const failure = {
      ...base,
      review: {
        reviewer: 'JUDGE' as const,
        score: 84,
        minScore: 80,
        blockers: ['x'],
        blocked: true,
      },
    };
    expect(threadFailureReasonKey(failure, ThreadFailureClass.REVIEW_NOT_PASSED)).toBe(
      'chat.threadEvidenceReasonBlocked',
    );
  });

  it('keeps the class sentence otherwise', () => {
    const failure = {
      ...base,
      review: { reviewer: 'JUDGE' as const, score: 50, minScore: 80, blockers: [], blocked: false },
    };
    expect(threadFailureReasonKey(failure, ThreadFailureClass.REVIEW_NOT_PASSED)).toBe(
      THREAD_CLASS_REASON_KEYS[ThreadFailureClass.REVIEW_NOT_PASSED],
    );
    expect(threadFailureReasonKey(base, ThreadFailureClass.EVIDENCE_GAP)).toBe(
      'chat.threadEvidenceReasonGap',
    );
  });
});

describe('research remedies as requests', () => {
  const progress = makeProgress();
  const request = { progress, idempotencyKey: 'k', team: null };

  it('"Research more" is a one-click retry that refreshes the research', () => {
    expect(
      buildRecoveryRetryRequest({ ...request, remedy: ThreadFailureRemedy.RESEARCH_MORE }),
    ).toEqual({ idempotencyKey: 'k', refreshResearch: true });
    const [research, narrow] = buildRecoveryActions({
      code: 'REVIEW_NOT_PASSED',
      failedStage: 'JUDGE',
      roleId: null,
      httpStatus: null,
      retryable: true,
      remedies: [ThreadFailureRemedy.RESEARCH_MORE, ThreadFailureRemedy.NARROW_CLAIMS],
    });
    expect(research?.oneClick).toBe(true);
    expect(narrow?.oneClick).toBe(false);
    expect(
      buildRecoveryRetryRequest({ ...request, remedy: ThreadFailureRemedy.NARROW_CLAIMS }),
    ).toBeNull();
  });

  it('the form adds refreshResearch only when asked', () => {
    const base = { progress, idempotencyKey: 'k', topic: '', spendCapUsd: '', roles: [] };
    expect(buildThreadRetryRequest(base)).toEqual({ idempotencyKey: 'k' });
    expect(buildThreadRetryRequest({ ...base, refreshResearch: true })).toEqual({
      idempotencyKey: 'k',
      refreshResearch: true,
    });
    expect(buildThreadRetryRequest({ ...base, refreshResearch: false })).toEqual({
      idempotencyKey: 'k',
    });
  });
});
