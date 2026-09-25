import { HttpStatus } from '@nestjs/common';
import { BusinessException, ProviderCreditExhaustedException } from '../../../../common/errors';
import {
  PROVIDER_CREDIT_EXHAUSTED_CODE,
  PROVIDER_CREDIT_EXHAUSTED_MESSAGE_KEY,
  PROVIDER_CREDIT_MIN_OUTPUT_TOKENS,
} from '../../constants/provider-credit.constants';
import {
  creditRetryCeiling,
  parseAffordableOutputTokens,
  redactProviderText,
  sanitizeUserFacingErrorMessage,
  toProviderHttpFailure,
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
