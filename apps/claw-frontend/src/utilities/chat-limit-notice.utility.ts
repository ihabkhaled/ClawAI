import { ApiErrorCode } from '@/enums';
import { ChatLimitKind } from '@/enums/chat-limit-kind.enum';
import type { ApiClientError } from '@/services/shared/api-client';
import type { ChatLimitNotice } from '@/types';

const KIND_BY_CODE: ReadonlyMap<string, ChatLimitKind> = new Map([
  [ApiErrorCode.QUOTA_DAILY_EXCEEDED, ChatLimitKind.DailyTokens],
  [ApiErrorCode.QUOTA_WEEKLY_EXCEEDED, ChatLimitKind.WeeklyTokens],
  [ApiErrorCode.QUOTA_MONTHLY_EXCEEDED, ChatLimitKind.MonthlyTokens],
  [ApiErrorCode.PLAN_DAILY_CHAT_LIMIT_EXCEEDED, ChatLimitKind.DailyChats],
  [ApiErrorCode.PLAN_DAILY_MESSAGE_LIMIT_EXCEEDED, ChatLimitKind.DailyMessages],
  [ApiErrorCode.PLAN_TRIAL_EXPIRED, ChatLimitKind.TrialExpired],
  [ApiErrorCode.PLAN_FEATURE_DISABLED, ChatLimitKind.FeatureDisabled],
]);

const TITLE_KEY_BY_KIND: Record<ChatLimitKind, string> = {
  [ChatLimitKind.DailyTokens]: 'chat.limits.dailyTokensTitle',
  [ChatLimitKind.WeeklyTokens]: 'chat.limits.weeklyTokensTitle',
  [ChatLimitKind.MonthlyTokens]: 'chat.limits.monthlyTokensTitle',
  [ChatLimitKind.DailyChats]: 'chat.limits.dailyChatsTitle',
  [ChatLimitKind.DailyMessages]: 'chat.limits.dailyMessagesTitle',
  [ChatLimitKind.TrialExpired]: 'chat.limits.trialExpiredTitle',
  [ChatLimitKind.FeatureDisabled]: 'chat.limits.featureDisabledTitle',
};

const BODY_KEY_BY_KIND: Record<ChatLimitKind, string> = {
  [ChatLimitKind.DailyTokens]: 'chat.limits.dailyTokensBody',
  [ChatLimitKind.WeeklyTokens]: 'chat.limits.weeklyTokensBody',
  [ChatLimitKind.MonthlyTokens]: 'chat.limits.monthlyTokensBody',
  [ChatLimitKind.DailyChats]: 'chat.limits.dailyChatsBody',
  [ChatLimitKind.DailyMessages]: 'chat.limits.dailyMessagesBody',
  [ChatLimitKind.TrialExpired]: 'chat.limits.trialExpiredBody',
  [ChatLimitKind.FeatureDisabled]: 'chat.limits.featureDisabledBody',
};

/**
 * Turns a send failure into a transcript notice, or nothing.
 *
 * Only limit failures qualify. A provider outage or a network drop is not a
 * decision about this account and does not belong in the conversation as a
 * standing line — those stay toasts.
 *
 * Returns null for anything unrecognised rather than guessing, because a
 * generic "you have hit a limit" printed into somebody's history when the real
 * cause was a 500 is worse than no line at all.
 */
export function resolveChatLimitNotice(error: unknown): ChatLimitNotice | null {
  if (error === null || typeof error !== 'object' || !('code' in error)) {
    return null;
  }

  const code = (error as ApiClientError).code;
  if (code === undefined) {return null;}

  const kind = KIND_BY_CODE.get(code);
  if (kind === undefined) {return null;}

  return {
    kind,
    titleKey: TITLE_KEY_BY_KIND[kind],
    bodyKey: BODY_KEY_BY_KIND[kind],
    // The trial wall and a feature gate both need a plan change; a daily
    // ceiling may simply need tomorrow, but upgrading also clears it.
    showUpgrade: true,
  };
}
