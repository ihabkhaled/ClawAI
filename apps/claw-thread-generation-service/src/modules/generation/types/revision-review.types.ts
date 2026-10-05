import { z } from 'zod';

import type { AuthorDraft, StructuredReview } from './generation-pipeline.types';

export const revisionAuthorVoteSchema = z.object({
  roleId: z.string().min(1).max(64),
  agrees: z.boolean(),
  draftHash: z.string().length(64),
});

export const revisionAuthorResponseSchema = z.object({
  agrees: z.boolean(),
  draftHash: z.string().length(64),
});

export type RevisionAuthorVote = z.infer<typeof revisionAuthorVoteSchema>;
export type RevisionReviewEvaluation = {
  draft: AuthorDraft;
  expectedAuthorIds: string[];
  votes: RevisionAuthorVote[];
  judge: StructuredReview;
  critic: StructuredReview;
  evidence: Map<string, string>;
};
