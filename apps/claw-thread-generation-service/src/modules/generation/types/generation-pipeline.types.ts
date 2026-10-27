import { z } from 'zod';
import type {
  Locale,
  ThreadArticleLength,
  ThreadHealingPool,
  ThreadPublicationType,
} from '@claw/shared-types';

import type { ThreadGenerationStage } from '../../../generated/prisma';
import type { ResearchEvidence } from '../../research/research.client';
import type { HealingBudget } from './healing.types';
import { clampReviewList, clampReviewText } from '../utilities/clamp-review-text.utility';
import { sanitizeDraftMarkup } from '../utilities/sanitize-draft-markup.utility';
import type { ReviewerRole } from './reviewer-role.enum';

export const modelRoleSchema = z.object({
  id: z.string().min(1).max(64),
  provider: z.string().min(1).max(100),
  model: z.string().min(1).max(200),
  maxOutputTokens: z.number().int().min(256).max(32_768),
  fallbacks: z
    .array(
      z.object({
        provider: z.string().min(1).max(100),
        model: z.string().min(1).max(200),
      }),
    )
    .max(3)
    .default([]),
});

const healingCandidateSchema = z.object({
  provider: z.string().min(1).max(100),
  model: z.string().min(1).max(200),
  windowTokens: z.number().int().positive().max(100_000_000).optional(),
  costRank: z.number().int().min(0).max(1000).optional(),
});

export const healingPoolSchema = z.object({
  pool: z.array(healingCandidateSchema).max(12).default([]),
  safeDefault: healingCandidateSchema.optional(),
});

export const authorDraftSchema = z.object({
  markdown: z.string().min(1).max(100_000).transform(sanitizeDraftMarkup),
  citations: z
    .array(z.object({ evidenceId: z.string().min(1), url: z.string().url() }))
    .min(1)
    .max(100),
});

const REVIEW_BLOCKERS_MAX = 10;
const REVIEW_FINDINGS_MAX = 5;
const REVIEW_BRIEF_MAX_CHARS = 1000;

export const reviewSchema = z.object({
  selectedCandidateIndex: z.number().int().min(0).max(4).default(0),
  score: z.number().int().min(0).max(100),
  // Long or numerous items are shortened, never rejected: a verbose review is still a review.
  blockers: z.array(z.string()).transform((items) => clampReviewList(items, REVIEW_BLOCKERS_MAX)),
  findings: z.array(z.string()).transform((items) => clampReviewList(items, REVIEW_FINDINGS_MAX)),
  // A reviewer that passes a draft often leaves the brief out; a missing one is an empty brief.
  revisionBrief: z
    .string()
    .default('')
    .transform((text) => clampReviewText(text, REVIEW_BRIEF_MAX_CHARS)),
});

export function reviewSchemaForCandidateCount(
  candidateCount: number,
  defaultCandidateIndex = 0,
): z.ZodType<StructuredReview> {
  return reviewSchema
    .extend({
      selectedCandidateIndex: z.number().int().min(0).max(4).default(defaultCandidateIndex),
    })
    .refine((review) => review.selectedCandidateIndex < candidateCount);
}

export const checkpointBundleSchema = z.record(z.string(), z.unknown());

export const ownerRevisionContentSchema = z.object({
  markdown: z.string(),
  citations: z.array(z.object({ evidenceId: z.string(), url: z.string().url() })),
  judge: z.object({ score: z.number().int().min(0).max(100) }),
  critic: z.object({ score: z.number().int().min(0).max(100) }),
  gapsDisclosed: z.boolean().optional(),
  review: z
    .object({
      draftHash: z.string().length(64),
      authorConsensus: z.boolean(),
      authorAgreementPercent: z.number().int().min(0).max(100).optional(),
      ready: z.boolean(),
      reasons: z.array(z.string()),
    })
    .optional(),
});

export type OwnerRevisionContent = z.infer<typeof ownerRevisionContentSchema>;
export type ModelRole = z.infer<typeof modelRoleSchema>;
export type AuthorDraft = z.infer<typeof authorDraftSchema>;
export type StructuredReview = z.infer<typeof reviewSchema>;

export type GenerationPipelineInput = {
  jobId: string;
  ownerId: string;
  budgetId: string;
  attempt: number;
  correlationId: string;
  topic: string;
  publicationType: ThreadPublicationType;
  contentLocale: Locale;
  sourceSnapshot: Record<string, unknown>;
  authors: ModelRole[];
  judge: ModelRole;
  critic: ModelRole;
  /** Models the ladder may swap in once the role's own backups are spent (ADR-181). */
  healing?: ThreadHealingPool;
  /** The job's cap and what it had spent when this attempt began, for the healing spend guard. */
  spendCapMicroUsd?: number;
  spentMicroUsd?: number;
  /** "Shorter article" asks the authors for about 60 percent of the usual length. */
  articleLength?: ThreadArticleLength;
  /** Evidence-gap blockers the owner accepted for this retry; the article discloses them (ADR-194). */
  acceptedEvidenceGaps?: string[];
  /** Runs the optional FORMAT stage after the reviews pass (ADR-189); off for an owner's own edit. */
  formatStage?: boolean;
  /** Set by the pipeline for one attempt: the counters that bound healing. */
  healingBudget?: HealingBudget;
  isCancellationRequested?: () => Promise<boolean>;
  /** Aborts the model call in flight on cancel, lease loss or the attempt time limit. */
  signal?: AbortSignal;
};

export type GenerationPipelineResult = {
  markdown: string;
  citations: AuthorDraft['citations'];
  draftHash: string;
  evidenceBundle: Record<string, unknown>;
  evidenceHash: string;
  rounds: number;
  authorDrafts: AuthorDraft[];
  judgeReview: StructuredReview;
  criticReview: StructuredReview;
  authorConsensus: boolean;
  authorAgreementPercent: number;
  reviewReady: boolean;
  reviewReasons: string[];
  /** True when the owner accepted evidence gaps and the article discloses them (ADR-194). */
  gapsDisclosed?: boolean;
};

export type PrivateGenerationState = {
  jobId: string;
  status: string;
  stage: string;
  round: number;
  safeErrorCode: string | null;
  /**
   * True once the job can no longer change by itself (completed, failed, cancelled, waiting for
   * review). `safeErrorCode` is the last attempt's code and can be set while the job still retries.
   */
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
    citations: AuthorDraft['citations'];
    judgeScore: number;
    criticScore: number;
    /** Present (true) only when the article was written with owner-accepted evidence gaps. */
    gapsDisclosed?: boolean;
  } | null;
};

export type GenerationRoundContext = {
  job: GenerationPipelineInput;
  evidence: ResearchEvidence;
  evidenceItems: Map<string, string>;
  sharedMaterial: string;
};

export type GenerationRoundOutcome =
  | { kind: 'passed'; result: GenerationPipelineResult }
  | { kind: 'retry'; revisionBrief: string; blockers: string[] };

export type ReviewStageSpec = {
  reviewer: ReviewerRole;
  stage: ThreadGenerationStage;
  minScore: number;
};

export type ReviewStageResult = {
  review: StructuredReview;
  /** Null when the review passed; otherwise the brief for the next round. */
  revisionBrief: string | null;
};
