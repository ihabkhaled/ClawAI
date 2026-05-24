// SCAFFOLD: stream R.1 (01-r1-learning-loop)

import type { DomainTag, PrivacyClass } from '../../../generated/prisma';

export type CandidateModel = {
  provider: string;
  model: string;
  score: number;
};

export type BiasInput = {
  userId: string;
  domain: DomainTag;
  taskFamily: string;
  candidates: CandidateModel[];
  privacyConstraint: PrivacyClass;
  threadId?: string;
};

export type AppliedBiasMetadata = {
  learnedScoreRowIds: string[];
  topicProfileRowId?: string;
  sampleSize: number;
  biasWeight: number;
  reasonTag: string;
};

export type BiasOutput = {
  candidates: CandidateModel[];
  appliedBias: AppliedBiasMetadata;
};
