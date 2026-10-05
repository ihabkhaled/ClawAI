import type { StartThreadGenerationDto } from '../dto/start-thread-generation.dto';

export type GenerationEnqueueInput = Omit<StartThreadGenerationDto, 'capMicroUsd'> & {
  spendCapMicroUsd: string;
  publicIntentVersion: string;
};

export type PrivateGenerationState = {
  jobId: string;
  status: string;
  stage: string;
  round: number;
  safeErrorCode: string | null;
  review: {
    draftHash: string;
    authorConsensus: boolean;
    ready: boolean;
    reasons: string[];
  } | null;
  draft: {
    markdown: string;
    citations: Array<{ evidenceId: string; url: string }>;
    judgeScore: number;
    criticScore: number;
  } | null;
};

export type RevisionReviewEnqueueInput = {
  parentJobId: string;
  idempotencyKey: string;
  correlationId: string;
  spendCapMicroUsd: string;
  draft: {
    markdown: string;
    citations: Array<{ evidenceId: string; url: string }>;
  };
};
