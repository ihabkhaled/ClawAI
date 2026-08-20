import { ApiErrorCode } from '@/enums';
import type { ApiClientError } from '@/services/shared/api-client';
import type { TranslateFunction } from '@/types';

const API_ERROR_MESSAGE_KEY_BY_CODE: ReadonlyMap<string, string> = new Map([
  [ApiErrorCode.PLAN_TRIAL_EXPIRED, 'chat.errors.planTrialExpired'],
  [ApiErrorCode.QUOTA_DAILY_EXCEEDED, 'chat.errors.dailyTokenLimitExceeded'],
  [ApiErrorCode.QUOTA_WEEKLY_EXCEEDED, 'chat.errors.weeklyTokenLimitExceeded'],
  [ApiErrorCode.QUOTA_MONTHLY_EXCEEDED, 'chat.errors.monthlyTokenLimitExceeded'],
  [ApiErrorCode.PLAN_DAILY_CHAT_LIMIT_EXCEEDED, 'chat.errors.dailyChatLimitExceeded'],
  [ApiErrorCode.PLAN_DAILY_MESSAGE_LIMIT_EXCEEDED, 'chat.errors.dailyMessageLimitExceeded'],
  [
    ApiErrorCode.PLAN_WORKSPACE_CONNECTION_LIMIT_EXCEEDED,
    'chat.errors.workspaceConnectionLimitExceeded',
  ],
  [ApiErrorCode.PLAN_CONTEXT_PACK_LIMIT_EXCEEDED, 'chat.errors.contextPackLimitExceeded'],
  [ApiErrorCode.PLAN_MEMORY_ITEM_LIMIT_EXCEEDED, 'chat.errors.memoryItemLimitExceeded'],
]);

export function resolveApiErrorMessage(
  error: unknown,
  t: TranslateFunction,
  fallback: string,
): string {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const apiError = error as ApiClientError;
    const messageKey =
      apiError.code === undefined ? undefined : API_ERROR_MESSAGE_KEY_BY_CODE.get(apiError.code);
    if (messageKey !== undefined) {
      return t(messageKey);
    }
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}
