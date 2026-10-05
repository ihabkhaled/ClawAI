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
  ready: boolean;
  reasons: string[];
} {
  const draftHash = revisionDraftHash(input.draft);
  const expectedAuthors = new Set(input.expectedAuthorIds);
  const votedAuthors = new Set(input.votes.map(({ roleId }) => roleId));
  const validVotes =
    expectedAuthors.size === input.expectedAuthorIds.length &&
    input.votes.length === expectedAuthors.size &&
    votedAuthors.size === expectedAuthors.size &&
    input.votes.every(
      (vote) => expectedAuthors.has(vote.roleId) && vote.agrees && vote.draftHash === draftHash,
    );
  const reasons: string[] = [];

  if (!validVotes) reasons.push('AUTHOR_CONSENSUS_FAILED');
  if (input.draft.citations.some(({ evidenceId, url }) => input.evidence.get(evidenceId) !== url)) {
    reasons.push('CITATION_NOT_IN_SAVED_EVIDENCE');
  }
  if (input.judge.score < MIN_JUDGE_SCORE || input.judge.blockers.length > 0) {
    reasons.push('JUDGE_THRESHOLD_FAILED');
  }
  if (input.critic.score < MIN_CRITIC_SCORE || input.critic.blockers.length > 0) {
    reasons.push('CRITIC_THRESHOLD_FAILED');
  }

  return { draftHash, ready: reasons.length === 0, reasons };
}
