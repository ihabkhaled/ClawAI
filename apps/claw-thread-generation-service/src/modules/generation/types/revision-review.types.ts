import { z } from 'zod';

import type { AuthorDraft, StructuredReview } from './generation-pipeline.types';

type RevisionStructuredReview = Omit<StructuredReview, 'selectedCandidateIndex'>;

export const revisionAuthorVoteSchema = z.object({
  roleId: z.string().min(1).max(64),
  agrees: z.boolean(),
  draftHash: z.string().length(64),
});

/** What the model returns. The hash is never asked for; an echoed `draftHash` is ignored. */
export const revisionAuthorResponseSchema = z.object({
  agrees: z.boolean(),
});

export const revisionCandidateVoteResponseSchema = z.object({
  preferredCandidateIndex: z.number().int().min(0).max(4),
});

export type RevisionAuthorVote = z.infer<typeof revisionAuthorVoteSchema>;
export type RevisionCandidateVote = {
  roleId: string;
  preferredCandidateIndex: number;
};
export type RevisionReviewEvaluation = {
  draft: AuthorDraft;
  expectedAuthorIds: string[];
  votes: RevisionAuthorVote[];
  judge: RevisionStructuredReview;
  critic: RevisionStructuredReview;
  evidence: Map<string, string>;
};
