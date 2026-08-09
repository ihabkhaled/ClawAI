import {
  THREAD_MAX_REROUTE_ATTEMPTS_MAX,
  THREAD_MAX_REROUTE_ATTEMPTS_MIN,
  THREAD_MAX_TOKENS_MAX,
  THREAD_MAX_TOKENS_MIN,
  THREAD_QUALITY_THRESHOLD_MAX,
  THREAD_QUALITY_THRESHOLD_MIN,
} from '@/constants';
import { ThreadSettingsError } from '@/enums';

/**
 * Mirrors the `maxTokens` rule in the chat-service update-thread Zod schema.
 * An empty string means "unset" and is valid — the API stores null.
 */
export function validateMaxTokens(raw: string): ThreadSettingsError | null {
  if (raw === '') {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return ThreadSettingsError.MaxTokensNotInteger;
  }
  if (parsed < THREAD_MAX_TOKENS_MIN || parsed > THREAD_MAX_TOKENS_MAX) {
    return ThreadSettingsError.MaxTokensOutOfRange;
  }
  return null;
}

export function validateQualityThreshold(value: number): ThreadSettingsError | null {
  if (
    !Number.isFinite(value) ||
    value < THREAD_QUALITY_THRESHOLD_MIN ||
    value > THREAD_QUALITY_THRESHOLD_MAX
  ) {
    return ThreadSettingsError.QualityThresholdOutOfRange;
  }
  return null;
}

export function validateMaxReRouteAttempts(value: number): ThreadSettingsError | null {
  if (
    !Number.isInteger(value) ||
    value < THREAD_MAX_REROUTE_ATTEMPTS_MIN ||
    value > THREAD_MAX_REROUTE_ATTEMPTS_MAX
  ) {
    return ThreadSettingsError.MaxReRouteAttemptsOutOfRange;
  }
  return null;
}
