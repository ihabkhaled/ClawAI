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
});
