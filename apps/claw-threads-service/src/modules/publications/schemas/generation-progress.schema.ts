import { z } from 'zod';
import type { ThreadGenerationProgress } from '@claw/shared-types';

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

const failureSchema = z.object({
  code: shortString,
  failedStage: shortString,
  roleId: nullableString,
  httpStatus: nullableInt,
  retryable: z.boolean(),
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
    steps: z.array(stepSchema).max(500),
  });

export const generationRetryResponseSchema = z.object({ jobId: shortString, status: shortString });
export const generationDeleteResponseSchema = z.object({ deleted: z.literal(true) });
