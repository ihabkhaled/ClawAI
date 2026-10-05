import { z } from 'zod';
import type { Locale, ThreadPublicationType } from '@claw/shared-types';

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
