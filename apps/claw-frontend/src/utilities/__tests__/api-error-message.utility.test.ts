import { describe, expect, it } from 'vitest';

import { ApiClientError } from '@/services/shared/api-client';
import { resolveApiErrorMessage } from '@/utilities/api-error-message.utility';

describe('resolveApiErrorMessage', () => {
  it('maps PLAN_TRIAL_EXPIRED without leaking the backend English message', () => {
    const error = new ApiClientError({
      message: 'Your free trial has expired',
      status: 403,
      code: 'PLAN_TRIAL_EXPIRED',
    });

    const message = resolveApiErrorMessage(error, (key) => `translated:${key}`, 'fallback');
    expect(message).toBe('translated:chat.errors.planTrialExpired');
    expect(message).not.toContain(error.message);
  });

  it.each([
    ['QUOTA_DAILY_EXCEEDED', 'chat.errors.dailyTokenLimitExceeded'],
    ['QUOTA_WEEKLY_EXCEEDED', 'chat.errors.weeklyTokenLimitExceeded'],
    ['QUOTA_MONTHLY_EXCEEDED', 'chat.errors.monthlyTokenLimitExceeded'],
    ['PLAN_DAILY_CHAT_LIMIT_EXCEEDED', 'chat.errors.dailyChatLimitExceeded'],
    ['PLAN_DAILY_MESSAGE_LIMIT_EXCEEDED', 'chat.errors.dailyMessageLimitExceeded'],
    ['PLAN_WORKSPACE_CONNECTION_LIMIT_EXCEEDED', 'chat.errors.workspaceConnectionLimitExceeded'],
    ['PLAN_CONTEXT_PACK_LIMIT_EXCEEDED', 'chat.errors.contextPackLimitExceeded'],
    ['PLAN_MEMORY_ITEM_LIMIT_EXCEEDED', 'chat.errors.memoryItemLimitExceeded'],
  ])('maps %s without leaking backend English', (code, key) => {
    const error = new ApiClientError({ message: 'Backend English', status: 429, code });

    const message = resolveApiErrorMessage(error, (value) => `translated:${value}`, 'fallback');

    expect(message).toBe(`translated:${key}`);
    expect(message).not.toContain(error.message);
  });
});
