import { ApiErrorCode } from '@/enums';
import type { ApiClientError } from '@/services/shared/api-client';
import type { TranslateFunction } from '@/types';

export function resolveApiErrorMessage(
  error: unknown,
  t: TranslateFunction,
  fallback: string,
): string {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const apiError = error as ApiClientError;
    if (apiError.code === ApiErrorCode.PLAN_TRIAL_EXPIRED) {
      return t('chat.errors.planTrialExpired');
    }
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}
