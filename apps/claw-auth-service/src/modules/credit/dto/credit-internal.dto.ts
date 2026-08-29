import { PaygSurface } from '@claw/shared-types';
import { z } from 'zod';

import {
  CREDIT_CALL_COUNT_MAX,
  CREDIT_MAX_OUTPUT_TOKENS_MAX,
  CREDIT_MODEL_MAX_LENGTH,
  CREDIT_PACKAGE_ID_MAX_LENGTH,
  CREDIT_PROVIDER_MAX_LENGTH,
  CREDIT_REQUEST_ID_MAX_LENGTH,
  CREDIT_TOKEN_COUNT_MAX,
  CREDIT_USER_ID_MAX_LENGTH,
  CREDIT_WORKFLOW_MAX_LENGTH,
} from '../constants/credit.constants';
import { CREDIT_RELEASE_REASONS } from '../constants/credit-release-reason.constants';

// Every field is bounded. These endpoints move money, and an unbounded token
// count would let a caller ask for a hold the arithmetic cannot represent —
// which is how a `Number.MAX_SAFE_INTEGER` overflow becomes a free request.

export const reserveCreditSchema = z.object({
  userId: z.string().min(1).max(CREDIT_USER_ID_MAX_LENGTH),
  // The idempotency key for the hold. A retried request reuses its reservation
  // rather than taking a second one against the same wallet.
  requestId: z.string().min(1).max(CREDIT_REQUEST_ID_MAX_LENGTH),
  provider: z.string().min(1).max(CREDIT_PROVIDER_MAX_LENGTH),
  model: z.string().min(1).max(CREDIT_MODEL_MAX_LENGTH),
  surface: z.nativeEnum(PaygSurface),
  workflow: z.string().min(1).max(CREDIT_WORKFLOW_MAX_LENGTH).nullish(),
  promptTokens: z.number().int().min(0).max(CREDIT_TOKEN_COUNT_MAX),
  cachedPromptTokens: z.number().int().min(0).max(CREDIT_TOKEN_COUNT_MAX),
  requestedMaxOutputTokens: z.number().int().min(1).max(CREDIT_MAX_OUTPUT_TOKENS_MAX),
});
export type ReserveCreditDto = z.infer<typeof reserveCreditSchema>;

export const finalizeCreditSchema = z.object({
  reservationId: z.string().uuid(),
  usage: z.object({
    promptTokens: z.number().int().min(0).max(CREDIT_TOKEN_COUNT_MAX),
    completionTokens: z.number().int().min(0).max(CREDIT_TOKEN_COUNT_MAX),
    // Subsets of the two totals above, as `TokenUsage` reports them. The cost
    // calculator prices DISJOINT counts, so the conversion happens in one
    // place (`toRawTokenBreakdown`) rather than at each caller — doing it here
    // would double-charge every cached and reasoning token.
    cachedPromptTokens: z.number().int().min(0).max(CREDIT_TOKEN_COUNT_MAX),
    reasoningTokens: z.number().int().min(0).max(CREDIT_TOKEN_COUNT_MAX),
  }),
  toolCalls: z.number().int().min(0).max(CREDIT_CALL_COUNT_MAX).default(0),
  searchCalls: z.number().int().min(0).max(CREDIT_CALL_COUNT_MAX).default(0),
});
export type FinalizeCreditDto = z.infer<typeof finalizeCreditSchema>;

export const releaseCreditSchema = z.object({
  reservationId: z.string().uuid(),
  reason: z.enum(CREDIT_RELEASE_REASONS),
});
export type ReleaseCreditDto = z.infer<typeof releaseCreditSchema>;

export const creditWalletParamSchema = z.object({
  userId: z.string().min(1).max(CREDIT_USER_ID_MAX_LENGTH),
});
export type CreditWalletParamDto = z.infer<typeof creditWalletParamSchema>;

// The package a top-up checkout names. Bounded like every other identifier on
// this controller: payment-service reads the PRICE from the version this
// resolves to, so an unbounded id here is an unbounded lookup on the money path.
export const creditPackageParamSchema = z.object({
  id: z.string().min(1).max(CREDIT_PACKAGE_ID_MAX_LENGTH),
});
export type CreditPackageParamDto = z.infer<typeof creditPackageParamSchema>;
