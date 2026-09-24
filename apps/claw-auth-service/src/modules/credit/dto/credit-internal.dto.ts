import { PaygSurface } from '@claw/shared-types';
import { z } from 'zod';

import {
  CREDIT_AUDIO_SECONDS_MAX,
  CREDIT_CALL_COUNT_MAX,
  CREDIT_IMAGE_UNITS_MAX,
  CREDIT_MAX_OUTPUT_TOKENS_MAX,
  CREDIT_MODEL_MAX_LENGTH,
  CREDIT_PACKAGE_ID_MAX_LENGTH,
  CREDIT_PROVIDER_MAX_LENGTH,
  CREDIT_REQUEST_ID_MAX_LENGTH,
  CREDIT_TOKEN_COUNT_MAX,
  CREDIT_TTS_CHARACTERS_MAX,
  CREDIT_USER_ID_MAX_LENGTH,
  CREDIT_WORKFLOW_MAX_LENGTH,
} from '../constants/credit.constants';
import { CREDIT_RELEASE_REASONS } from '../constants/credit-release-reason.constants';

// Every field is bounded. These endpoints move money, and an unbounded token
// count would let a caller ask for a hold the arithmetic cannot represent —
// which is how a `Number.MAX_SAFE_INTEGER` overflow becomes a free request.

// Unit metering (images, seconds of input audio, characters of speech).
// Optional and defaulted to 0 so every caller that predates them is unchanged;
// integer-only so a fractional count cannot reach the BigInt price arithmetic.
const unitCountFields = {
  imageUnits: z.number().int().min(0).max(CREDIT_IMAGE_UNITS_MAX).default(0),
  audioSeconds: z.number().int().min(0).max(CREDIT_AUDIO_SECONDS_MAX).default(0),
  ttsCharacters: z.number().int().min(0).max(CREDIT_TTS_CHARACTERS_MAX).default(0),
};

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
  // EXPECTED units: the hold is sized on them.
  ...unitCountFields,
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
  // MEASURED units: what the call actually produced. A non-token surface
  // settles on these, never on zero tokens.
  ...unitCountFields,
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
