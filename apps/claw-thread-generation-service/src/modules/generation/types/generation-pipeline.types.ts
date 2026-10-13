import { z } from 'zod';
import type { Locale, ThreadPublicationType } from '@claw/shared-types';

import type { ThreadGenerationStage } from '../../../generated/prisma';
import type { ResearchEvidence } from '../../research/research.client';
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

export const authorDraftSchema = z.object({
  markdown: z.string().min(1).max(100_000),
  citations: z
    .array(z.object({ evidenceId: z.string().min(1), url: z.string().url() }))
    .min(1)
    .max(100),
});

export const reviewSchema = z.object({
  score: z.number().int().min(0).max(100),
  blockers: z.array(z.string().min(1).max(300)).max(10),
  findings: z.array(z.string().min(1).max(300)).max(5),
  revisionBrief: z.string().max(1000),
});

export const checkpointBundleSchema = z.record(z.string(), z.unknown());

export const ownerRevisionContentSchema = z.object({
  markdown: z.string(),
  citations: z.array(z.object({ evidenceId: z.string(), url: z.string().url() })),
  judge: z.object({ score: z.number().int().min(0).max(100) }),
  critic: z.object({ score: z.number().int().min(0).max(100) }),
  review: z
    .object({
      draftHash: z.string().length(64),
      authorConsensus: z.boolean(),
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
  reviewReady: boolean;
  reviewReasons: string[];
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
    citations: AuthorDraft['citations'];
    judgeScore: number;
    criticScore: number;
  } | null;
};

export type GenerationRoundContext = {
  job: GenerationPipelineInput;
  evidence: ResearchEvidence;
  evidenceItems: Map<string, string>;
  sharedMaterial: string;
};

export type GenerationRoundOutcome =
  { kind: 'passed'; result: GenerationPipelineResult } | { kind: 'retry'; revisionBrief: string };

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
