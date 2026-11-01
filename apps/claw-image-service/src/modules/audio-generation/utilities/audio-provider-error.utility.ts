import { HttpStatus } from '@nestjs/common';

import { AudioFailureCode } from '../../../common/enums';
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
  AUDIO_AUTH_FAILURE_MARKERS,
  AUDIO_CONTENT_POLICY_MARKERS,
  AUDIO_CREDITS_DEPLETED_MARKERS,
  AUDIO_MODEL_MISSING_MARKERS,
  AUDIO_QUOTA_MARKERS,
  audioFailureMessage,
} from '../constants/audio-failure.constants';

function includesAny(text: string, markers: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return markers.some((marker) => lower.includes(marker));
}

function classifyAudioFailure(error: unknown, detail: string): AudioFailureCode {
  const status = readProviderHttpStatus(error);
  if (status === undefined) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : undefined;
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
      return AudioFailureCode.GENERATION_TIMED_OUT;
    }
    return code !== undefined && IMAGE_TRANSPORT_ERROR_CODES.includes(code)
      ? AudioFailureCode.PROVIDER_UNAVAILABLE
      : AudioFailureCode.PROVIDER_FAILURE;
  }
  if (includesAny(detail, AUDIO_CREDITS_DEPLETED_MARKERS)) {
    return AudioFailureCode.PROVIDER_CREDITS_DEPLETED;
  }
  if (includesAny(detail, AUDIO_QUOTA_MARKERS)) {
    return AudioFailureCode.PROVIDER_QUOTA_EXCEEDED;
  }
  if (
    IMAGE_AUTH_FAILURE_STATUSES.includes(status) ||
    includesAny(detail, AUDIO_AUTH_FAILURE_MARKERS)
  ) {
    return AudioFailureCode.PROVIDER_AUTH_FAILED;
  }
  if (IMAGE_QUOTA_FAILURE_STATUSES.includes(status)) {
    return AudioFailureCode.PROVIDER_QUOTA_EXCEEDED;
  }
  if (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
    return AudioFailureCode.PROVIDER_UNAVAILABLE;
  }
  if (includesAny(detail, AUDIO_CONTENT_POLICY_MARKERS)) {
    return AudioFailureCode.CONTENT_REJECTED;
  }
  return status === Number(HttpStatus.NOT_FOUND) || includesAny(detail, AUDIO_MODEL_MISSING_MARKERS)
    ? AudioFailureCode.MODEL_UNAVAILABLE
    : AudioFailureCode.PROVIDER_REJECTED;
}

/**
 * Converts a thrown provider call into a `BusinessException` whose `code` says WHY it
 * failed. The message carries the provider's own words for the log; what reaches the
 * user is the fixed sentence for the code.
 */
export function toAudioProviderException(error: unknown, providerLabel: string): BusinessException {
  if (error instanceof BusinessException) {
    return error;
  }
  const detail = extractProviderErrorMessage(error);
  return new BusinessException(
    `${providerLabel} audio generation failed: ${detail}`,
    classifyAudioFailure(error, detail),
    HttpStatus.BAD_GATEWAY,
  );
}

/** A failure this service decided on its own, carrying the fixed sentence for its code. */
export function audioFailure(code: AudioFailureCode, detail?: string): BusinessException {
  const base = audioFailureMessage(code);
  return new BusinessException(
    detail === undefined ? base : `${base} (${detail})`,
    code,
    HttpStatus.BAD_GATEWAY,
  );
}

/** The failure code a stored error carries, or the generic one for an unknown throw. */
export function audioFailureCodeOf(error: unknown): string {
  return error instanceof BusinessException ? error.code : AudioFailureCode.PROVIDER_FAILURE;
}
