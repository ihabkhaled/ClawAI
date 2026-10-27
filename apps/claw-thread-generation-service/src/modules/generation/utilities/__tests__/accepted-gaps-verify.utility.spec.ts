import type { ThreadReviewVerdict } from '@claw/shared-types';

import {
  acceptedGapRejected,
  canonicalGap,
  requestsAcceptedGaps,
  verifyAcceptedGaps,
} from '../accepted-gaps-verify.utility';

const GAP = 'the article does not cite independent primary sources on sycophancy';
const SECOND = 'repository files are not in the evidence, so claims cannot be verified';

const verdict = (evidenceGapBlockers: string[] | undefined): ThreadReviewVerdict => ({
  reviewer: 'JUDGE',
  score: 84,
  minScore: 80,
  blockers: [GAP, SECOND, 'The second section contradicts the introduction.'],
  blocked: true,
  ...(evidenceGapBlockers ? { evidenceGapBlockers } : {}),
});

describe('verifyAcceptedGaps (ADR-195)', () => {
  it('returns nothing when nothing is requested, even with no verdict', () => {
    expect(verifyAcceptedGaps(null, undefined, undefined)).toEqual([]);
    expect(verifyAcceptedGaps(null, [], [])).toEqual([]);
    expect(requestsAcceptedGaps([], [])).toBe(false);
  });

  it('compares after NFKC, control-character removal and whitespace collapse', () => {
    expect(canonicalGap('  ＴＨＥ article\u0000  does\n\tnot ')).toBe('THE article does not');
    const stored = verdict(['The article does not cite sources']);

    expect(
      verifyAcceptedGaps(stored, ['  The  article does not cite sources '], undefined),
    ).toEqual(['The article does not cite sources']);
  });

  it('is case sensitive: a different text is a different text', () => {
    expect(() => verifyAcceptedGaps(verdict([GAP]), [GAP.toUpperCase()], undefined)).toThrow();
  });

  it('rejects when there is no verdict, no evidence-gap blocker or an unknown text or index', () => {
    expect(() => verifyAcceptedGaps(null, [GAP], undefined)).toThrow();
    expect(() => verifyAcceptedGaps(verdict(undefined), [GAP], undefined)).toThrow();
    expect(() => verifyAcceptedGaps(verdict([]), undefined, [0])).toThrow();
    expect(() => verifyAcceptedGaps(verdict([GAP]), ['nope'], undefined)).toThrow();
    expect(() => verifyAcceptedGaps(verdict([GAP]), undefined, [1])).toThrow();
    expect(() => verifyAcceptedGaps(verdict([GAP]), undefined, [-1])).toThrow();
  });

  it('joins texts and indexes, once each, in a stable order', () => {
    const stored = verdict([SECOND, GAP]);

    expect(verifyAcceptedGaps(stored, [GAP], [0, 1])).toEqual([GAP, SECOND].sort());
  });

  it('carries a machine code in the 400 body', () => {
    expect(acceptedGapRejected().getResponse()).toMatchObject({
      code: 'ACCEPTED_GAP_NOT_A_BLOCKER',
      statusCode: 400,
    });
  });
});
