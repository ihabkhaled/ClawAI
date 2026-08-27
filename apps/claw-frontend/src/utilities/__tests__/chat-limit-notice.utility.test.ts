import { describe, expect, it } from 'vitest';

import { ApiErrorCode } from '@/enums';
import { ChatLimitKind } from '@/enums/chat-limit-kind.enum';
import { resolveChatLimitNotice } from '@/utilities/chat-limit-notice.utility';

describe('resolveChatLimitNotice', () => {
  it('names the window that was hit, not just "a limit"', () => {
    // A line that stays in the conversation has to say which ceiling and over
    // what period; a toast could get away with one generic string.
    expect(resolveChatLimitNotice({ code: ApiErrorCode.QUOTA_DAILY_EXCEEDED })?.kind).toBe(
      ChatLimitKind.DailyTokens,
    );
    expect(resolveChatLimitNotice({ code: ApiErrorCode.QUOTA_WEEKLY_EXCEEDED })?.kind).toBe(
      ChatLimitKind.WeeklyTokens,
    );
    expect(resolveChatLimitNotice({ code: ApiErrorCode.QUOTA_MONTHLY_EXCEEDED })?.kind).toBe(
      ChatLimitKind.MonthlyTokens,
    );
  });

  it('covers the per-day chat and message ceilings, which are enforced today', () => {
    expect(
      resolveChatLimitNotice({ code: ApiErrorCode.PLAN_DAILY_CHAT_LIMIT_EXCEEDED })?.kind,
    ).toBe(ChatLimitKind.DailyChats);
    expect(
      resolveChatLimitNotice({ code: ApiErrorCode.PLAN_DAILY_MESSAGE_LIMIT_EXCEEDED })?.kind,
    ).toBe(ChatLimitKind.DailyMessages);
  });

  it('covers the trial wall, which is a different thing from a quota', () => {
    // Free is a 30-day trial, so day 31 is not "you used your allowance".
    expect(resolveChatLimitNotice({ code: ApiErrorCode.PLAN_TRIAL_EXPIRED })?.kind).toBe(
      ChatLimitKind.TrialExpired,
    );
  });

  it('gives every kind its own title and body key', () => {
    const daily = resolveChatLimitNotice({ code: ApiErrorCode.QUOTA_DAILY_EXCEEDED });
    const trial = resolveChatLimitNotice({ code: ApiErrorCode.PLAN_TRIAL_EXPIRED });

    expect(daily?.titleKey).not.toBe(trial?.titleKey);
    expect(daily?.bodyKey).not.toBe(trial?.bodyKey);
  });

  it('returns nothing for a failure that is not about this account', () => {
    // A provider outage printed into somebody's history as "you hit a limit" is
    // worse than no line at all.
    expect(resolveChatLimitNotice({ code: 'ALL_PROVIDERS_FAILED' })).toBeNull();
    expect(resolveChatLimitNotice(new Error('network down'))).toBeNull();
    expect(resolveChatLimitNotice(null)).toBeNull();
    expect(resolveChatLimitNotice(undefined)).toBeNull();
    expect(resolveChatLimitNotice({})).toBeNull();
    expect(resolveChatLimitNotice({ code: undefined })).toBeNull();
  });
});
