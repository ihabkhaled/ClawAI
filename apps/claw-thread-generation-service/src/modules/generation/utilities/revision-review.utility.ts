import { createHash } from 'node:crypto';

import type { AuthorDraft } from '../types/generation-pipeline.types';
import type { RevisionReviewEvaluation } from '../types/revision-review.types';
import { MIN_CRITIC_SCORE, MIN_JUDGE_SCORE } from '../constants/generation.constants';

export function revisionDraftHash(draft: AuthorDraft): string {
  const content = {
    markdown: draft.markdown,
    citations: draft.citations.map(({ evidenceId, url }) => ({ evidenceId, url })),
  };
  return createHash('sha256').update(JSON.stringify(content)).digest('hex');
}

export function evaluateRevisionReview(input: RevisionReviewEvaluation): {
  draftHash: string;
  authorAgreementPercent: number;
  ready: boolean;
  reasons: string[];
} {
  const draftHash = revisionDraftHash(input.draft);
  const expectedAuthors = new Set(input.expectedAuthorIds);
  const matchingVotes = input.votes.filter(
    (vote, index) =>
      expectedAuthors.has(vote.roleId) &&
      vote.draftHash === draftHash &&
      input.votes.findIndex((candidate) => candidate.roleId === vote.roleId) === index,
  );
  const authorAgreementPercent =
    expectedAuthors.size === 0
      ? 0
      : Math.round(
          (matchingVotes.filter((vote) => vote.agrees).length / expectedAuthors.size) * 100,
        );
  const reasons: string[] = [];

  if (input.draft.citations.some(({ evidenceId, url }) => input.evidence.get(evidenceId) !== url)) {
    reasons.push('CITATION_NOT_IN_SAVED_EVIDENCE');
  }
  if (input.judge.score < MIN_JUDGE_SCORE || input.judge.blockers.length > 0) {
    reasons.push('JUDGE_THRESHOLD_FAILED');
  }
  if (input.critic.score < MIN_CRITIC_SCORE || input.critic.blockers.length > 0) {
    reasons.push('CRITIC_THRESHOLD_FAILED');
  }

  return { draftHash, authorAgreementPercent, ready: reasons.length === 0, reasons };
}
