import { z } from 'zod';

// v3 round 4 (2026-05-12) — Prompt 04 polish: HTTP entry point for the
// multi-model PR/MR review orchestrator. Caller posts the PR/MR diff (or
// description body) plus 1-5 reviewer models + optional judge model.
// Validated bounds match the orchestrator's runtime guards.

const reviewerModelRefSchema = z.object({
  provider: z.string().min(1).max(64),
  model: z.string().min(1).max(256),
  label: z.string().min(1).max(120).optional(),
});

export const multiModelReviewRequestSchema = z.object({
  content: z.string().min(1).max(200_000),
  reviewerModels: z.array(reviewerModelRefSchema).min(1).max(5),
  judgeModel: reviewerModelRefSchema.optional(),
  // Optional caller-supplied timeout in ms. Capped at 5 minutes per reviewer
  // so a bad caller can't pin a backend thread.
  timeoutMs: z.number().int().positive().max(5 * 60 * 1000).optional(),
});

export type MultiModelReviewRequestDto = z.infer<typeof multiModelReviewRequestSchema>;
