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

  it('maps ANTIVIRUS_UNAVAILABLE (503) to the translated "scanner restarting" message', () => {
    const error = new ApiClientError({
      message: 'An unexpected server error occurred. Please try again later.',
      status: 503,
      code: 'ANTIVIRUS_UNAVAILABLE',
    });

    const message = resolveApiErrorMessage(error, (key) => `translated:${key}`, 'fallback');

    expect(message).toBe('translated:files.antivirusUnavailable');
  });

  it('translates a quote whose source left the conversation instead of showing server English', () => {
    const error = new ApiClientError({
      message: 'The quoted message is no longer in this conversation',
      status: 404,
      code: 'QUOTE_SOURCE_NOT_FOUND',
    });

    const message = resolveApiErrorMessage(error, (key) => `translated:${key}`, 'fallback');

    expect(message).toBe('translated:chat.quote.sourceMissing');
  });

  it('maps PROMPT_LIBRARY_FULL to the translated limit message', () => {
    const error = new ApiClientError({
      message: 'You can save at most 200 prompts',
      status: 409,
      code: 'PROMPT_LIBRARY_FULL',
    });
    expect(resolveApiErrorMessage(error, (key) => `t:${key}`, 'fb')).toBe(
      't:promptLibrary.limitReached',
    );
  });
});

describe('resolveApiErrorMessage rate limit', () => {
  it('turns a RATE_LIMITED 429 into "try again in N minutes"', () => {
    const error = new ApiClientError({
      message: 'Too many attempts. Please try again later.',
      status: 429,
      code: 'RATE_LIMITED',
      retryAfterSeconds: 125,
    });
    expect(
      resolveApiErrorMessage(error, (key, params) => `${key}:${JSON.stringify(params)}`, 'fb'),
    ).toBe('auth.rateLimit.tryAgainInMinutes:{"minutes":3}');
  });

  it('keeps a mapped code ahead of the rate-limit copy', () => {
    const error = new ApiClientError({
      message: 'x',
      status: 429,
      code: 'PROMPT_LIBRARY_FULL',
    });
    expect(resolveApiErrorMessage(error, (key) => key, 'fb')).toBe('promptLibrary.limitReached');
  });
});
