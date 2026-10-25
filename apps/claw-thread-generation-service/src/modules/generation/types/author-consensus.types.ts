import type { AuthorDraft } from './generation-pipeline.types';

export interface AuthorCandidateVote {
  role: string;
  preferredCandidateIndex: number;
}

export type AuthorCandidateReviewContext = {
  candidates: AuthorDraft[];
  agreementPercent: number;
  preferredCandidateIndex: number;
};

export type AuthorConsensusResult =
  | {
      status: 'consensus' | 'dissent';
      preferredCandidateIndex: number;
      agreementPercent: number;
    }
  | {
      status: 'invalid';
      reason: 'author-count' | 'duplicate-role' | 'candidate-index';
    };
