import { z } from 'zod';
import {
  ThreadFailureClass,
  ThreadFailurePhase,
  ThreadFailureRemedy,
  type ThreadGenerationProgress,
  ThreadHealingResult,
  ThreadHealingStrategy,
} from '@claw/shared-types';

const roleKindSchema = z.enum(['AUTHOR', 'JUDGE', 'CRITIC', 'RESEARCH', 'SYSTEM']);
const shortString = z.string().max(200);
const nullableString = shortString.nullable();
const nullableInt = z.number().int().nullable();

const stepSchema = z.object({
  seq: z.number().int(),
  at: shortString,
  stage: shortString,
  round: z.number().int(),
  outcome: z.enum(['STARTED', 'SUCCEEDED', 'FAILED', 'RETRY', 'FALLBACK', 'SKIPPED']),
  roleKind: roleKindSchema,
  roleId: nullableString,
  provider: nullableString,
  model: nullableString,
  code: nullableString,
  httpStatus: nullableInt,
  durationMs: nullableInt,
  inputTokens: nullableInt,
  outputTokens: nullableInt,
  excerpt: z.string().max(1200).nullable(),
});

const selectionsSchema = z.object({
  topic: z.string().max(10_000),
  publicationType: shortString,
  contentLocale: shortString,
  sourceThreadId: shortString,
  spendCapMicroUsd: z.string().max(40),
  roles: z.array(
    z.object({
      roleId: shortString,
      roleKind: roleKindSchema,
      provider: shortString,
      model: shortString,
      fallbacks: z.array(z.object({ provider: shortString, model: shortString })).max(20),
    }),
  ),
});

const reviewVerdictSchema = z.object({
  reviewer: z.enum(['JUDGE', 'CRITIC']),
  score: z.number().int().min(0).max(100),
  minScore: z.number().int().min(0).max(100),
  // The reviewer's blocker texts, in the article's language, kept as given and only bounded.
  blockers: z.array(z.string().max(600)).max(10),
  blocked: z.boolean(),
  // The blockers the owner may accept as disclosed gaps (ADR-194); absent from an older service.
  evidenceGapBlockers: z.array(z.string().max(600)).max(10).optional(),
  // The model that really answered the review, and whether it replaced the owner's pick (ADR-195).
  reviewerModel: z
    .object({ provider: shortString, model: shortString, fallback: z.boolean() })
    .optional(),
});

const failureSchema = z.object({
  code: shortString,
  failedStage: shortString,
  roleId: nullableString,
  httpStatus: nullableInt,
  retryable: z.boolean(),
  // Absent from an older generation service; the panel then falls back to the plain code.
  phase: z.nativeEnum(ThreadFailurePhase).optional(),
  failureClass: z.nativeEnum(ThreadFailureClass).optional(),
  remedies: z.array(z.nativeEnum(ThreadFailureRemedy)).max(10).optional(),
  suggestedModel: z.object({ provider: shortString, model: shortString }).nullish(),
  // What the last failed review said (ADR-193); absent from an older generation service.
  review: reviewVerdictSchema.nullish(),
});

const queueSchema = z.object({
  state: z.enum(['WAITING_FOR_WORKER', 'BACKOFF']),
  ahead: z.number().int().nonnegative(),
  retryAt: z.string().max(64).nullable(),
});

const healingSchema = z.object({
  attempts: z
    .array(
      z.object({
        seq: z.number().int(),
        phase: z.nativeEnum(ThreadFailurePhase),
        roleId: nullableString,
        strategy: z.nativeEnum(ThreadHealingStrategy),
        failureClass: z.nativeEnum(ThreadFailureClass),
        provider: nullableString,
        model: nullableString,
        result: z.nativeEnum(ThreadHealingResult),
      }),
    )
    .max(100),
  active: z.boolean(),
});

export const generationProgressSchema: z.ZodType<Omit<ThreadGenerationProgress, 'publicationId'>> =
  z.object({
    jobId: shortString,
    status: shortString,
    stage: shortString,
    round: z.number().int(),
    attemptCount: z.number().int(),
    maxAttempts: z.number().int(),
    spentMicroCredits: z.string().max(40),
    // Kept (not stripped) so the owner's UI can say "our problem, your allowance is back".
    allowanceRefunded: z.boolean().default(false),
    createdAt: shortString,
    updatedAt: shortString,
    selections: selectionsSchema,
    failure: failureSchema.nullable(),
    healing: healingSchema.optional(),
    queue: queueSchema.nullish(),
    steps: z.array(stepSchema).max(500),
  });

export const generationRetryResponseSchema = z.object({ jobId: shortString, status: shortString });
export const generationDeleteResponseSchema = z.object({ deleted: z.literal(true) });
