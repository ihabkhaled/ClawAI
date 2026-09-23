import { HttpStatus } from '@nestjs/common';

import { ImageFailureCode } from '../../../common/enums';

/**
 * The English sentence stored beside each failure code.
 *
 * Fixed strings, never the provider's own text: an upstream message can carry a
 * prompt, a URL or a key fragment, and this string is persisted and streamed to
 * the browser. The provider's detail goes to the log and the event row instead.
 * The frontend renders the translated sentence for the code and falls back to
 * this one only for a code it does not know.
 */
// A Map, not a Record: `[code]` bracket access on a Record flags
// security/detect-object-injection even though `code` is a closed enum, and
// image-service's lint:strict runs at --max-warnings 0.
export const IMAGE_FAILURE_MESSAGES: ReadonlyMap<ImageFailureCode, string> = new Map([
  [ImageFailureCode.PROVIDER_FAILURE, 'Image generation failed. Please try again.'],
  [
    ImageFailureCode.PROVIDER_AUTH_FAILED,
    'The image provider rejected the connector credentials for this model. An administrator needs to check the API key and its access.',
  ],
  [
    ImageFailureCode.PROVIDER_QUOTA_EXCEEDED,
    'The image provider refused the request because the account quota or billing limit was reached.',
  ],
  [
    ImageFailureCode.PROVIDER_REJECTED,
    'The image provider rejected the request for this model. Try another image model.',
  ],
  [
    ImageFailureCode.MODEL_UNAVAILABLE,
    'This image model is not available from the provider any more. Pick another image model.',
  ],
  [
    ImageFailureCode.CONTENT_REJECTED,
    'The image provider declined this prompt under its content policy. Rephrase the request and try again.',
  ],
  [
    ImageFailureCode.NO_IMAGE_RETURNED,
    'The model answered without producing an image. Rephrase the request as an image description and try again.',
  ],
  [
    ImageFailureCode.PROVIDER_UNAVAILABLE,
    'The image provider is not responding right now. Try again in a moment.',
  ],
  [
    ImageFailureCode.CONNECTOR_NOT_CONFIGURED,
    'No connector is configured for this image provider. An administrator needs to add one.',
  ],
  [
    ImageFailureCode.STORAGE_FAILED,
    'The image was generated but could not be saved. Try again in a moment.',
  ],
]);

/** The fixed sentence for a code, or the generic fallback for one this map does not carry. */
export function imageFailureMessage(code: ImageFailureCode): string {
  return (
    IMAGE_FAILURE_MESSAGES.get(code) ??
    IMAGE_FAILURE_MESSAGES.get(ImageFailureCode.PROVIDER_FAILURE) ??
    'Image generation failed. Please try again.'
  );
}

/**
 * Failure codes after which a different provider cannot do any better.
 *
 * Storage is shared by every provider, so when file-service is down each
 * auto-fallback attempt pays a provider for an image and then loses it the same
 * way. The chain stops instead of spending money it cannot turn into a picture.
 */
export const IMAGE_CHAIN_TERMINAL_FAILURE_CODES: readonly string[] = [
  ImageFailureCode.STORAGE_FAILED,
];

/** Lower-cased fragments that mark a provider refusal as a content-policy block. */
export const IMAGE_CONTENT_POLICY_MARKERS: readonly string[] = [
  'content_policy',
  'content policy',
  'safety',
  'moderation',
  'blocked',
  'prohibited',
];

/**
 * Lower-cased fragments of an auth refusal that arrives as a 400.
 *
 * Gemini answers a bad key with `400 INVALID_ARGUMENT "API key not valid"`,
 * not 401, so the status alone would misfile it as a rejected request.
 */
export const IMAGE_AUTH_FAILURE_MARKERS: readonly string[] = [
  'api key not valid',
  'api_key_invalid',
  'invalid api key',
  'incorrect api key',
];

/** Lower-cased fragments that mark a 400/404 as "this model does not exist here". */
export const IMAGE_MODEL_MISSING_MARKERS: readonly string[] = [
  'does not exist',
  'not found',
  'is not supported',
  'unknown model',
  'model not found',
];

/** Transport error codes that mean the provider could not be reached at all. */
export const IMAGE_TRANSPORT_ERROR_CODES: readonly string[] = [
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
];

/** Provider HTTP statuses, grouped by the failure code each one maps to. */
export const IMAGE_AUTH_FAILURE_STATUSES: readonly number[] = [
  HttpStatus.UNAUTHORIZED,
  HttpStatus.FORBIDDEN,
];

export const IMAGE_QUOTA_FAILURE_STATUSES: readonly number[] = [
  HttpStatus.PAYMENT_REQUIRED,
  HttpStatus.TOO_MANY_REQUESTS,
];

/** Gemini `finishReason` / `blockReason` values that mean a safety block. */
export const GEMINI_SAFETY_FINISH_REASONS: readonly string[] = [
  'SAFETY',
  'IMAGE_SAFETY',
  'PROHIBITED_CONTENT',
  'BLOCKLIST',
  'SPII',
  'RECITATION',
  'OTHER',
];
