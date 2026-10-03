import { HttpStatus } from '@nestjs/common';

import { VideoFailureCode } from '../../../common/enums';
import { BusinessException } from '../../../common/errors';
import {
  extractProviderErrorMessage,
  readProviderHttpStatus,
} from '../../image-generation/adapter.utilities/provider-error.utility';
import {
  IMAGE_AUTH_FAILURE_STATUSES,
  IMAGE_QUOTA_FAILURE_STATUSES,
  IMAGE_TRANSPORT_ERROR_CODES,
} from '../../image-generation/constants/image-failure.constants';
import {
  VIDEO_AUTH_FAILURE_MARKERS,
  VIDEO_CONTENT_POLICY_MARKERS,
  VIDEO_CREDITS_DEPLETED_MARKERS,
  VIDEO_MODEL_MISSING_MARKERS,
  VIDEO_PROVIDER_ERROR_PREFIX,
  VIDEO_QUOTA_MARKERS,
  VIDEO_SECRET_SHAPES,
  videoFailureMessage,
} from '../constants/video-failure.constants';

import {
  VEO_MODEL_FALLBACK_CODES,
  VIDEO_REJECTION_REASON_MAX_CHARACTERS,
} from '../constants/video-generation.constants';

function includesAny(text: string, markers: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return markers.some((marker) => lower.includes(marker));
}

function classifyVideoFailure(error: unknown, detail: string): VideoFailureCode {
  const status = readProviderHttpStatus(error);
  if (status === undefined) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : undefined;
    return code !== undefined && IMAGE_TRANSPORT_ERROR_CODES.includes(code)
      ? VideoFailureCode.PROVIDER_UNAVAILABLE
      : VideoFailureCode.PROVIDER_FAILURE;
  }
  if (includesAny(detail, VIDEO_CREDITS_DEPLETED_MARKERS)) {
    return VideoFailureCode.PROVIDER_CREDITS_DEPLETED;
  }
  if (includesAny(detail, VIDEO_QUOTA_MARKERS)) {
    return VideoFailureCode.PROVIDER_QUOTA_EXCEEDED;
  }
  if (
    IMAGE_AUTH_FAILURE_STATUSES.includes(status) ||
    includesAny(detail, VIDEO_AUTH_FAILURE_MARKERS)
  ) {
    return VideoFailureCode.PROVIDER_AUTH_FAILED;
  }
  if (IMAGE_QUOTA_FAILURE_STATUSES.includes(status)) {
    return VideoFailureCode.PROVIDER_QUOTA_EXCEEDED;
  }
  if (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
    return VideoFailureCode.PROVIDER_UNAVAILABLE;
  }
  if (includesAny(detail, VIDEO_CONTENT_POLICY_MARKERS)) {
    return VideoFailureCode.CONTENT_REJECTED;
  }
  return status === Number(HttpStatus.NOT_FOUND) || includesAny(detail, VIDEO_MODEL_MISSING_MARKERS)
    ? VideoFailureCode.MODEL_UNAVAILABLE
    : VideoFailureCode.PROVIDER_REJECTED;
}

/**
 * Converts a thrown provider call into a `BusinessException` whose `code` says
 * WHY it failed. The message carries the provider's own words for the log; what
 * reaches the user is the fixed sentence for the code.
 */
export function toVideoProviderException(error: unknown, providerLabel: string): BusinessException {
  if (error instanceof BusinessException) {
    return error;
  }
  const detail = extractProviderErrorMessage(error);
  return new BusinessException(
    `${providerLabel} video generation failed: ${detail}`,
    classifyVideoFailure(error, detail),
    HttpStatus.BAD_GATEWAY,
  );
}

/** A failure this service decided on its own, carrying the fixed sentence for its code. */
export function videoFailure(code: VideoFailureCode, detail?: string): BusinessException {
  const base = videoFailureMessage(code);
  return new BusinessException(
    detail === undefined ? base : `${base} (${detail})`,
    code,
    HttpStatus.BAD_GATEWAY,
  );
}

/** The failure code a stored error carries, or the generic one for an unknown throw. */
export function videoFailureCodeOf(error: unknown): string {
  return error instanceof BusinessException ? error.code : VideoFailureCode.PROVIDER_FAILURE;
}

/**
 * The provider's own reason for a refusal, made safe to store: the log prefix is
 * stripped, key-shaped tokens are redacted, whitespace is collapsed and the text
 * is capped. `undefined` when the error carries nothing worth showing.
 */
export function videoRejectionReason(error: unknown): string | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }
  const reason = error.message
    .replaceAll(VIDEO_PROVIDER_ERROR_PREFIX, '')
    .replaceAll(VIDEO_SECRET_SHAPES, '[redacted]')
    .replaceAll(/\s+/gu, ' ')
    .trim();
  return reason.length === 0 ? undefined : reason.slice(0, VIDEO_REJECTION_REASON_MAX_CHARACTERS);
}

/**
 * The sentence stored on a failed row. A generic rejection or a missing model says
 * nothing a user can act on by itself, so it carries the provider's reason too;
 * every other code keeps its fixed sentence.
 */
export function storedVideoFailureMessage(code: VideoFailureCode, error: unknown): string {
  const base = videoFailureMessage(code);
  if (!VEO_MODEL_FALLBACK_CODES.includes(code)) {
    return base;
  }
  // A poll-time failure arrives as "<base> (<detail>)"; keep only the detail.
  const own = videoRejectionReason(error)
    ?.replace(base, '')
    .replace(/^\s*\((.*)\)\s*$/u, '$1')
    .trim();
  return own === undefined || own.length === 0 ? base : `${base} Provider said: ${own}`;
}
