import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { describe, expect, it, vi } from 'vitest';

import { BotCheckOutcome } from '../../../modules/anti-abuse/enums/bot-check-outcome.enum';
import { EmailDomainVerdict } from '../../../modules/anti-abuse/enums/email-domain-verdict.enum';
import {
  botCheckRefusal,
  emailDomainRefusal,
  signupLimitedRefusal,
} from '../../../modules/anti-abuse/utilities/anti-abuse-refusal.utility';
import { GlobalExceptionFilter } from '../global-exception.filter';

function send(exception: unknown): {
  status: unknown;
  body: Record<string, unknown>;
  headers: Map<string, string>;
} {
  const headers = new Map<string, string>();
  const response = {
    status: vi.fn(),
    json: vi.fn(),
    setHeader: vi.fn((name: string, value: string) => headers.set(name, value)),
  };
  response.status.mockReturnValue(response);
  new GlobalExceptionFilter({ record: vi.fn() }).catch(
    exception,
    new ExecutionContextHost([{}, response, vi.fn()]),
  );
  return {
    status: response.status.mock.calls[0]?.[0],
    body: response.json.mock.calls[0]?.[0],
    headers,
  };
}

describe('GlobalExceptionFilter: anti-abuse refusals', () => {
  it('sends DISPOSABLE_EMAIL as a 400 on the email field', () => {
    const { status, body, headers } = send(emailDomainRefusal(EmailDomainVerdict.DISPOSABLE));
    expect(status).toBe(400);
    expect(body).toMatchObject({ code: 'DISPOSABLE_EMAIL', field: 'email' });
    expect(headers.size).toBe(0);
  });

  it('sends SIGNUP_TEMPORARILY_LIMITED as a 429 with Retry-After', () => {
    const { status, body, headers } = send(signupLimitedRefusal(420));
    expect(status).toBe(429);
    expect(body).toMatchObject({ code: 'SIGNUP_TEMPORARILY_LIMITED', retryAfterSeconds: 420 });
    expect(headers.get('Retry-After')).toBe('420');
  });

  it('sends BOT_CHECK_REQUIRED as 428 and BOT_CHECK_FAILED as 403, with no extra field', () => {
    const required = send(botCheckRefusal(BotCheckOutcome.REQUIRED));
    const failed = send(botCheckRefusal(BotCheckOutcome.FAILED));
    expect([required.status, required.body.code]).toEqual([428, 'BOT_CHECK_REQUIRED']);
    expect([failed.status, failed.body.code]).toEqual([403, 'BOT_CHECK_FAILED']);
    expect(required.body).not.toHaveProperty('field');
  });
});
