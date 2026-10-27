import type { ThreadGenerationProgress, ThreadHealingPool } from '@claw/shared-types';

import type { PublicationStatus } from '../../../generated/prisma';
import type { StartThreadGenerationDto } from '../dto/start-thread-generation.dto';

export type GenerationEnqueueInput = Omit<StartThreadGenerationDto, 'capMicroUsd'> & {
  spendCapMicroUsd: string;
  publicIntentVersion: string;
  /** Models the generation service may heal with after the seat's own backups (ADR-181). */
  healing?: ThreadHealingPool;
};

export type PrivateGenerationState = {
  jobId: string;
  status: string;
  stage: string;
  round: number;
  safeErrorCode: string | null;
  /** False while the job is queued or running, even when `safeErrorCode` holds the last attempt's code. */
  terminal: boolean;
  review: {
    draftHash: string;
    authorConsensus: boolean;
    authorAgreementPercent?: number;
    ready: boolean;
    reasons: string[];
  } | null;
  draft: {
    markdown: string;
    citations: Array<{ evidenceId: string; url: string }>;
    judgeScore: number;
    criticScore: number;
    /** True when the article was written with owner-accepted evidence gaps (ADR-194). */
    gapsDisclosed?: boolean;
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

/** What the generation service returns to the owner; the publication id is added here. */
export type OwnerGenerationProgress = Omit<ThreadGenerationProgress, 'publicationId'>;

/** A publication the caller owns, with the job it currently points at. */
export type OwnedGeneration = {
  id: string;
  generationJobId: string;
  status: PublicationStatus;
};

export type RetryGenerationResult = {
  publicationId: string;
  jobId: string;
  status: string;
};

export type DeleteGenerationResult = { deleted: true };

/** Recent success and failure counts of one provider/model, from the generation service. */
export type ModelHealthEntry = { provider: string; model: string; ok: number; failed: number };
