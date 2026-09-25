import { HttpStatus } from '@nestjs/common';
import {
  BusinessException,
  ProviderCreditExhaustedException,
  ProviderOutputLimitException,
  ProviderRateLimitedException,
} from '../../../../common/errors';
import {
  PROVIDER_CREDIT_EXHAUSTED_CODE,
  PROVIDER_CREDIT_EXHAUSTED_MESSAGE_KEY,
  PROVIDER_CREDIT_MIN_OUTPUT_TOKENS,
  PROVIDER_OUTPUT_LIMIT_MESSAGE_KEY,
  PROVIDER_RATE_LIMITED_MESSAGE_KEY,
} from '../../constants/provider-credit.constants';
import {
  creditRetryCeiling,
  isAccountExhaustion,
  parseAffordableOutputTokens,
  parseProviderOutputLimit,
  providerRetryPlan,
  redactProviderText,
  sanitizeUserFacingErrorMessage,
  toProviderHttpFailure,
  userFacingErrorText,
} from '../provider-http-failure.utility';

// The body production returned on 2026-09-25 (key hash replaced).
const OPENROUTER_402 = {
  error: {
    message:
      "This request requires more credits, or fewer max_tokens. You requested up to 31776 tokens, but can only afford 9063. To increase, visit https://openrouter.ai/workspaces/default/keys/abc123def456 and adjust the key's total limit",
    code: 402,
  },
};

describe('parseAffordableOutputTokens', () => {
  it('reads N from the OpenRouter sentence', () => {
    expect(parseAffordableOutputTokens(JSON.stringify(OPENROUTER_402))).toBe(9063);
  });

  it('accepts thousands separators', () => {
    expect(parseAffordableOutputTokens('but can only afford 12,345.')).toBe(12_345);
  });

  it('is undefined when the sentence is absent or the text is not a string', () => {
    expect(parseAffordableOutputTokens('insufficient_quota')).toBeUndefined();
    expect(parseAffordableOutputTokens(undefined)).toBeUndefined();
  });

  it('survives the 300-char truncation the stream path used to apply', () => {
    const truncated = `${JSON.stringify(OPENROUTER_402).slice(0, 297)}...`;
    expect(parseAffordableOutputTokens(truncated)).toBe(9063);
  });
});

describe('creditRetryCeiling', () => {
  it('is 90% of N, floored', () => {
    expect(creditRetryCeiling(new ProviderCreditExhaustedException(9063))).toBe(8156);
  });

  it('refuses a ceiling below the minimum answer size', () => {
    expect(creditRetryCeiling(new ProviderCreditExhaustedException(280))).toBeUndefined();
    expect(
      creditRetryCeiling(
        new ProviderCreditExhaustedException(
          Math.ceil((PROVIDER_CREDIT_MIN_OUTPUT_TOKENS * 10) / 9),
        ),
      ),
    ).toBe(PROVIDER_CREDIT_MIN_OUTPUT_TOKENS);
  });

  it('is undefined for an error with no stated ceiling, or any other error', () => {
    expect(creditRetryCeiling(new ProviderCreditExhaustedException(undefined))).toBeUndefined();
    expect(creditRetryCeiling(new Error('boom'))).toBeUndefined();
  });
});

describe('toProviderHttpFailure', () => {
  it('maps the OpenRouter 402 (parsed JSON) to the stable credit error with N', () => {
    const error = toProviderHttpFailure({
      status: 402,
      fallbackMessage: 'Provider OPENROUTER returned status 402',
      body: OPENROUTER_402,
      failureCode: 'CLOUD_PROVIDER_REQUEST_FAILED',
    });
    expect(error).toBeInstanceOf(ProviderCreditExhaustedException);
    const credit = error as ProviderCreditExhaustedException;
    expect(credit.code).toBe(PROVIDER_CREDIT_EXHAUSTED_CODE);
    expect(credit.messageKey).toBe(PROVIDER_CREDIT_EXHAUSTED_MESSAGE_KEY);
    expect(credit.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(credit.affordableOutputTokens).toBe(9063);
  });

  it('maps the raw streaming text body the same way', () => {
    const error = toProviderHttpFailure({
      status: 402,
      fallbackMessage: 'Provider OPENROUTER returned status 402',
      body: JSON.stringify(OPENROUTER_402),
      failureCode: 'STREAM_PROVIDER_REQUEST_FAILED',
    }) as ProviderCreditExhaustedException;
    expect(error.code).toBe(PROVIDER_CREDIT_EXHAUSTED_CODE);
    expect(error.affordableOutputTokens).toBe(9063);
  });

  it('never carries a URL or the key hash in the message (credit case)', () => {
    const error = toProviderHttpFailure({
      status: 402,
      fallbackMessage: 'Provider OPENROUTER returned status 402',
      body: OPENROUTER_402,
      failureCode: 'X',
    });
    expect(error.message).not.toMatch(/https?:\/\//u);
    expect(error.message).not.toContain('abc123def456');
    expect(JSON.stringify(error.getResponse())).not.toContain('abc123def456');
  });

  it('treats a 429 insufficient_quota as credit, with no retry ceiling', () => {
    const error = toProviderHttpFailure({
      status: 429,
      fallbackMessage: 'Provider OPENAI returned status 429',
      body: { error: { message: 'You exceeded your current quota', code: 'insufficient_quota' } },
      failureCode: 'X',
    }) as ProviderCreditExhaustedException;
    expect(error.code).toBe(PROVIDER_CREDIT_EXHAUSTED_CODE);
    expect(error.affordableOutputTokens).toBeUndefined();
  });

  it('keeps a plain provider sentence and the caller code for a non-credit failure', () => {
    const error = toProviderHttpFailure({
      status: 400,
      fallbackMessage: 'Provider OPENAI returned status 400',
      body: { error: { message: '`temperature` is deprecated for this model.' } },
      failureCode: 'CLOUD_PROVIDER_REQUEST_FAILED',
    });
    expect(error).toBeInstanceOf(BusinessException);
    expect(error).not.toBeInstanceOf(ProviderCreditExhaustedException);
    expect(error.code).toBe('CLOUD_PROVIDER_REQUEST_FAILED');
    expect(error.message).toBe('`temperature` is deprecated for this model.');
  });

  it('drops a non-credit provider sentence that carries a URL', () => {
    const error = toProviderHttpFailure({
      status: 403,
      fallbackMessage: 'Provider GEMINI returned status 403',
      body: {
        error: { message: 'Enable billing at https://console.cloud.google.com/billing?p=42' },
      },
      failureCode: 'CLOUD_PROVIDER_REQUEST_FAILED',
    });
    expect(error.message).toBe('Provider GEMINI returned status 403');
  });

  it('never returns an unparseable raw body verbatim', () => {
    const error = toProviderHttpFailure({
      status: 500,
      fallbackMessage: 'Provider GROQ returned status 500',
      body: '<html>upstream https://internal.example/trace</html>',
      failureCode: 'STREAM_PROVIDER_REQUEST_FAILED',
    });
    expect(error.message).toBe('Provider GROQ returned status 500');
    expect(error.code).toBe('STREAM_PROVIDER_REQUEST_FAILED');
  });

  it('reads the top-level message and string error shapes', () => {
    expect(
      toProviderHttpFailure({
        status: 400,
        fallbackMessage: 'Provider P returned status 400',
        body: { message: 'bad model' },
        failureCode: 'C',
      }).message,
    ).toBe('bad model');
    expect(
      toProviderHttpFailure({
        status: 400,
        body: { error: 'nope' },
        failureCode: 'C',
        fallbackMessage: 'fb',
      }).message,
    ).toBe('nope');
  });
});

// Verbatim production bodies, 2026-09-10..25 (ADR-125).
const PROD = {
  groqOutput: {
    status: 400,
    body: {
      error: {
        message:
          '`max_tokens` must be less than or equal to `16384`, the maximum value for `max_tokens` is less than the `context_window` for this model',
        type: 'invalid_request_error',
      },
    },
  },
  ollamaOutput: {
    status: 400,
    body: {
      error: "max_tokens (32768) exceeds model's maximum output tokens (16384) for model kimi-k3",
    },
  },
  openAiOutput: {
    status: 400,
    body: {
      error: {
        message:
          'max_tokens is too large: 32768. This model supports at most 16384 completion tokens, whereas you provided 32768.',
      },
    },
  },
  anthropicOutput: {
    status: 400,
    body: {
      type: 'error',
      error: {
        type: 'invalid_request_error',
        message:
          'max_tokens: 32768 > 8192, which is the maximum allowed number of output tokens for claude-3-5-haiku-20241022',
      },
    },
  },
  geminiOutput: {
    status: 400,
    body: {
      error: {
        message:
          'Unable to submit request because it has a maxOutputTokens value of 100000 but the supported range is from 1 (inclusive) to 65537 (exclusive). Update the value and try again.',
      },
    },
  },
  openRouterFree429: {
    status: 429,
    body: {
      error: {
        message: 'Provider returned error',
        code: 429,
        metadata: {
          raw: 'z-ai/glm-5.2:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to accumulate your rate limits: https://openrouter.ai/settings/integrations',
          provider_name: 'Chutes',
        },
      },
    },
  },
  openAiNoCredits: {
    status: 429,
    body: {
      error: {
        message:
          'You have no credits remaining. Add credits to continue using the API: https://platform.openai.com/settings/organization/billing.',
        type: 'insufficient_quota',
        code: 'insufficient_quota',
      },
    },
  },
  anthropicLowBalance: {
    status: 400,
    body: {
      type: 'error',
      error: {
        type: 'invalid_request_error',
        message:
          'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.',
      },
    },
  },
  geminiQuota: {
    status: 429,
    body: JSON.stringify([
      {
        error: {
          code: 429,
          message:
            'You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits.',
          status: 'RESOURCE_EXHAUSTED',
        },
      },
    ]),
  },
};

const classify = (sample: { status: number; body: unknown }, failureCode = 'CODE') =>
  toProviderHttpFailure({
    status: sample.status,
    body: sample.body,
    failureCode,
    fallbackMessage: 'fallback',
  });

describe('output-limit refusals (ADR-125)', () => {
  it.each([
    ['Groq', PROD.groqOutput, 16_384],
    ['Ollama Cloud', PROD.ollamaOutput, 16_384],
    ['OpenAI', PROD.openAiOutput, 16_384],
    ['Anthropic', PROD.anthropicOutput, 8_192],
    ['Gemini (exclusive bound)', PROD.geminiOutput, 65_536],
  ])('%s → the model real ceiling', (_name, sample, expected) => {
    const error = classify(sample, 'CLOUD_PROVIDER_REQUEST_FAILED');
    expect(error).toBeInstanceOf(ProviderOutputLimitException);
    expect((error as ProviderOutputLimitException).maxOutputTokens).toBe(expected);
    expect(error.code).toBe('CLOUD_PROVIDER_REQUEST_FAILED');
    expect(error.messageKey).toBe(PROVIDER_OUTPUT_LIMIT_MESSAGE_KEY);
  });

  it('a too-long PROMPT is not an output-limit refusal', () => {
    const error = classify({
      status: 400,
      body: {
        error: {
          message:
            "This model's maximum context length is 128000 tokens. However, your messages resulted in 140000 tokens.",
        },
      },
    });
    expect(error).not.toBeInstanceOf(ProviderOutputLimitException);
  });

  it('parseProviderOutputLimit ignores text without a max_tokens subject', () => {
    expect(parseProviderOutputLimit('value must be less than or equal to `5`')).toBeUndefined();
  });
});

describe('account-level credit exhaustion (ADR-125)', () => {
  it.each([
    ['OpenAI no credits', PROD.openAiNoCredits],
    ['Anthropic low balance', PROD.anthropicLowBalance],
    ['Gemini quota', PROD.geminiQuota],
  ])('%s → PROVIDER_CREDIT_EXHAUSTED, account-wide', (_name, sample) => {
    const error = classify(sample) as ProviderCreditExhaustedException;
    expect(error).toBeInstanceOf(ProviderCreditExhaustedException);
    expect(error.code).toBe(PROVIDER_CREDIT_EXHAUSTED_CODE);
    expect(error.accountExhausted).toBe(true);
  });

  it('OpenRouter "can only afford" is request-level (no breaker)', () => {
    const error = classify({
      status: 402,
      body: OPENROUTER_402,
    }) as ProviderCreditExhaustedException;
    expect(error.accountExhausted).toBe(false);
  });
});

describe('transient rate limits (ADR-125)', () => {
  it('OpenRouter :free upstream rate limit → rate-limited, caller code kept', () => {
    const error = classify(PROD.openRouterFree429, 'CLOUD_PROVIDER_UNAVAILABLE');
    expect(error).toBeInstanceOf(ProviderRateLimitedException);
    expect(error.code).toBe('CLOUD_PROVIDER_UNAVAILABLE');
    expect(error.messageKey).toBe(PROVIDER_RATE_LIMITED_MESSAGE_KEY);
  });

  it('a bare 429 is a rate limit too', () => {
    expect(classify({ status: 429, body: 'Too Many Requests' })).toBeInstanceOf(
      ProviderRateLimitedException,
    );
  });
});

describe('no raw provider text reaches a user — every production body', () => {
  it.each(Object.entries(PROD))('%s', (_name, sample) => {
    const error = classify(sample);
    const exposed = `${error.message} ${JSON.stringify(error.getResponse())}`;
    expect(exposed).not.toMatch(/https?:\/\//u);
    expect(error.message).not.toContain('{');
    expect(error.message).not.toContain('[');
  });
});

describe('userFacingErrorText (compare / consensus lanes)', () => {
  it.each([
    '{"error":{"message":"You have no credits remaining."}}',
    '[{\n  "error": {\n    "code": 429 } }]',
    'visit https://openrouter.ai/workspaces/default/keys/abc',
  ])('replaces raw provider text: %s', (message) => {
    expect(userFacingErrorText(new Error(message), 'fallback')).toBe('fallback');
  });

  it('keeps our own sentences and handles non-Errors', () => {
    expect(userFacingErrorText(new Error('Model execution timed out'), 'fb')).toBe(
      'Model execution timed out',
    );
    expect(userFacingErrorText('boom', 'fb')).toBe('fb');
  });
});

describe('providerRetryPlan', () => {
  it('output limit → retry at the ceiling and remember it', () => {
    expect(providerRetryPlan(new ProviderOutputLimitException(16_384, 'C'))).toMatchObject({
      ceiling: 16_384,
      learnedMaxOutputTokens: 16_384,
    });
  });

  it('rate limit → one delayed retry, no cap change', () => {
    const plan = providerRetryPlan(new ProviderRateLimitedException('C'));
    expect(plan?.delayMs).toBeGreaterThan(0);
    expect(plan?.ceiling).toBeUndefined();
  });

  it('account exhaustion and ordinary errors → no retry', () => {
    expect(
      providerRetryPlan(new ProviderCreditExhaustedException(undefined, true)),
    ).toBeUndefined();
    expect(providerRetryPlan(new Error('x'))).toBeUndefined();
    expect(providerRetryPlan(new ProviderOutputLimitException(10, 'C'))).toBeUndefined();
  });

  it('isAccountExhaustion only for account-wide credit errors', () => {
    expect(isAccountExhaustion(new ProviderCreditExhaustedException(undefined, true))).toBe(true);
    expect(isAccountExhaustion(new ProviderCreditExhaustedException(9063))).toBe(false);
  });
});

describe('redactProviderText', () => {
  it('replaces every URL and bounds the length for a log line', () => {
    const redacted = redactProviderText(JSON.stringify(OPENROUTER_402));
    expect(redacted).not.toContain('abc123def456');
    expect(redacted).toContain('<url>');
    expect(redacted.length).toBeLessThanOrEqual(300);
  });

  it('stringifies an object body', () => {
    expect(redactProviderText({ a: 'https://x.y/z' })).toBe('{"a":"<url>"}');
  });
});

describe('sanitizeUserFacingErrorMessage', () => {
  it('passes a plain sentence through', () => {
    expect(sanitizeUserFacingErrorMessage('Model timed out', 'fallback')).toBe('Model timed out');
  });

  it('replaces any message carrying a URL with the fallback', () => {
    expect(sanitizeUserFacingErrorMessage(JSON.stringify(OPENROUTER_402), 'fallback')).toBe(
      'fallback',
    );
  });
});
