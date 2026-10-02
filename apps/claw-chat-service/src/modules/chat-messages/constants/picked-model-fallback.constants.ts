import { HttpStatus } from '@nestjs/common';

/**
 * Smart fallback for a model the user PICKED (MANUAL_MODEL). routing-service
 * names the substitutes (`pickedModelSubstitutes` on message.routed); chat
 * tries at most this many after the pick itself fails.
 */
export const PICKED_MODEL_MAX_FALLBACKS = 2;

/** How many usable models the "everything failed" bubble offers as buttons. */
export const PICKED_MODEL_MAX_SUGGESTIONS = 3;

/** The routing mode a user's explicit model pick travels under. */
export const PICKED_MODEL_ROUTING_MODE = 'MANUAL_MODEL';

export const PICKED_MODEL_FAILED_CODE = 'PICKED_MODEL_FAILED';

// The frontend allow-lists this key (chat-stream-error.constants.ts) and renders
// the suggestions + "choose another model" picker from the stored metadata.
export const PICKED_MODEL_FAILED_MESSAGE_KEY = 'pickedModel.failedMessage';

/**
 * Refusals that are about the USER, not the provider: credit (402), plan or
 * exposure (403) and our own rate/quota limits (429). Another model cannot fix
 * any of them, and falling back after one would hide the real reason (and an
 * upgrade notice) behind a different model's answer.
 */
export const PICKED_MODEL_NON_SUBSTITUTABLE_STATUSES: ReadonlySet<number> = new Set([
  HttpStatus.PAYMENT_REQUIRED,
  HttpStatus.FORBIDDEN,
  HttpStatus.TOO_MANY_REQUESTS,
]);

/** A user stop is never a provider failure. */
export const PICKED_MODEL_CANCELLED_CODE = 'STREAM_CANCELLED';

/** HTTP statuses that mean the whole provider is unwell, not one model. */
export const PICKED_MODEL_PROVIDER_WIDE_STATUSES: ReadonlySet<number> = new Set([
  HttpStatus.BAD_GATEWAY,
  HttpStatus.SERVICE_UNAVAILABLE,
  HttpStatus.GATEWAY_TIMEOUT,
  529,
]);
