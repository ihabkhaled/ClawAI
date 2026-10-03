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
  VIDEO_QUOTA_MARKERS,
  videoFailureMessage,
} from '../constants/video-failure.constants';

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
