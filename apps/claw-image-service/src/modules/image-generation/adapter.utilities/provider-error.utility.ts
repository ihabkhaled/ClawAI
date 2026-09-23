import { HttpStatus } from '@nestjs/common';

import { ImageFailureCode } from '../../../common/enums';
import { BusinessException } from '../../../common/errors';
import {
  IMAGE_AUTH_FAILURE_MARKERS,
  IMAGE_AUTH_FAILURE_STATUSES,
  IMAGE_CONTENT_POLICY_MARKERS,
  IMAGE_MODEL_MISSING_MARKERS,
  IMAGE_QUOTA_FAILURE_STATUSES,
  IMAGE_TRANSPORT_ERROR_CODES,
  imageFailureMessage,
} from '../constants/image-failure.constants';
import type { ProviderErrorShape } from '../types/provider-error.types';

function asErrorShape(error: unknown): ProviderErrorShape {
  return typeof error === 'object' && error !== null ? error : {};
}

/**
 * The provider's own explanation for a refusal, or the transport error.
 *
 * Reaches into the axios error shape rather than through the shared wrapper
 * because the wrapper returns `response.data` and drops the error body — which
 * is the only place a provider puts the reason. Three dialects exist:
 * OpenAI and Gemini answer `{ error: { message } }`, xAI answers
 * `{ code, error: "<sentence>" }`, and a few proxies answer `{ message }`.
 */
export function extractProviderErrorMessage(error: unknown): string {
  const body = asErrorShape(error).response?.data;
  const nested = typeof body?.error === 'object' ? body.error.message : undefined;
  const candidates = [
    nested,
    typeof body?.error === 'string' ? body.error : undefined,
    body?.message,
  ];
  const found = candidates.find((c): c is string => typeof c === 'string' && c.length > 0);
  if (found !== undefined) {
    return found;
  }
  return error instanceof Error ? error.message : 'unknown error';
}

/** The provider's HTTP status, or `undefined` when the request never got an answer. */
export function readProviderHttpStatus(error: unknown): number | undefined {
  return asErrorShape(error).response?.status;
}

function includesAny(text: string, markers: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return markers.some((marker) => lower.includes(marker));
}

function classifyCode(error: unknown, detail: string): ImageFailureCode {
  const status = readProviderHttpStatus(error);
  if (status === undefined) {
    const code = asErrorShape(error).code;
    return code !== undefined && IMAGE_TRANSPORT_ERROR_CODES.includes(code)
      ? ImageFailureCode.PROVIDER_UNAVAILABLE
      : ImageFailureCode.PROVIDER_FAILURE;
  }
  if (
    IMAGE_AUTH_FAILURE_STATUSES.includes(status) ||
    includesAny(detail, IMAGE_AUTH_FAILURE_MARKERS)
  ) {
    return ImageFailureCode.PROVIDER_AUTH_FAILED;
  }
  if (IMAGE_QUOTA_FAILURE_STATUSES.includes(status)) {
    return ImageFailureCode.PROVIDER_QUOTA_EXCEEDED;
  }
  if (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
    return ImageFailureCode.PROVIDER_UNAVAILABLE;
  }
  if (includesAny(detail, IMAGE_CONTENT_POLICY_MARKERS)) {
    return ImageFailureCode.CONTENT_REJECTED;
  }
  return status === Number(HttpStatus.NOT_FOUND) || includesAny(detail, IMAGE_MODEL_MISSING_MARKERS)
    ? ImageFailureCode.MODEL_UNAVAILABLE
    : ImageFailureCode.PROVIDER_REJECTED;
}

/**
 * Converts a thrown provider call into a `BusinessException` whose `code` says
 * WHY it failed.
 *
 * The exception message carries the provider's own words for the log and the
 * event row; what reaches the user is the fixed sentence for the code (see
 * `describeImageFailure`). A provider refusal — quota, revoked key, retired
 * model, content policy — is therefore told apart from our own failure, and
 * never shown as a generic "please try again".
 */
export function toImageProviderException(error: unknown, providerLabel: string): BusinessException {
  if (error instanceof BusinessException) {
    return error;
  }
  const detail = extractProviderErrorMessage(error);
  const code = classifyCode(error, detail);
  return new BusinessException(
    `${providerLabel} image generation failed: ${detail}`,
    code,
    HttpStatus.BAD_GATEWAY,
  );
}

/** A failure this service decided on its own, carrying the fixed sentence for its code. */
export function imageFailure(code: ImageFailureCode, detail?: string): BusinessException {
  const base = imageFailureMessage(code);
  const message = detail === undefined ? base : `${base} (${detail})`;
  return new BusinessException(message, code, HttpStatus.BAD_GATEWAY);
}
