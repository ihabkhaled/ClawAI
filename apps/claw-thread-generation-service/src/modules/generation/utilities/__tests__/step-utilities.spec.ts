import { ServiceUnavailableException } from '@nestjs/common';

import { parseStepError } from '../parse-step-error.utility';
import { toExcerpt } from '../redact-excerpt.utility';
import { roleStepInfo } from '../role-step.utility';
import { ThreadGenerationCancelledError } from '../thread-generation-cancelled.error';

describe('parseStepError', () => {
  it('reads the upstream status and machine code', () => {
    const error = new ServiceUnavailableException(
      'Chat model request failed (402: PAYG_CREDIT_EXHAUSTED)',
    );
    expect(parseStepError(error)).toEqual({ code: 'PAYG_CREDIT_EXHAUSTED', httpStatus: 402 });
  });

  it('maps a status with no code, and 429 to a rate limit', () => {
    expect(parseStepError(new Error('Chat model request failed (500)'))).toEqual({
      code: 'PROVIDER_ERROR',
      httpStatus: 500,
    });
    expect(parseStepError(new Error('Chat model request failed (429)'))).toEqual({
      code: 'PROVIDER_RATE_LIMITED',
      httpStatus: 429,
    });
  });

  it('prefers the wrapped upstream failure over the wrapper message', () => {
    const inner = new Error('Chat model request failed (402: PAYG_CREDIT_EXHAUSTED)');
    const wrapper = new ServiceUnavailableException('An author role failed', { cause: inner });
    expect(parseStepError(wrapper)).toEqual({ code: 'PAYG_CREDIT_EXHAUSTED', httpStatus: 402 });
  });

  it('keeps a wrapper code when the cause has no status', () => {
    const wrapper = new Error('A draft cited a URL outside its evidence bundle', {
      cause: new Error('plain'),
    });
    expect(parseStepError(wrapper)).toEqual({ code: 'CITATION_INVALID', httpStatus: null });
  });

  it.each([
    ['Chat model gateway is unavailable', 'PROVIDER_UNAVAILABLE'],
    ['Complete role context exceeds the model window', 'CONTEXT_WINDOW_EXCEEDED'],
    ['A model returned invalid structured output', 'OUTPUT_INVALID'],
    ['Research service is unavailable', 'RESEARCH_UNAVAILABLE'],
    ['Generation did not pass consensus and reviews in three rounds', 'REVIEW_NOT_PASSED'],
  ])('maps "%s"', (message, code) => {
    expect(parseStepError(new Error(message))).toEqual({ code, httpStatus: null });
  });

  it('maps cancellation', () => {
    expect(parseStepError(new ThreadGenerationCancelledError()).code).toBe('CANCELLED');
  });

  it('falls back to PROVIDER_ERROR, or the supplied code, for unknown input', () => {
    expect(parseStepError(new Error('boom'))).toEqual({
      code: 'PROVIDER_ERROR',
      httpStatus: null,
    });
    expect(parseStepError('text', 'GENERATION_FAILED').code).toBe('GENERATION_FAILED');
  });
});

describe('toExcerpt', () => {
  it('returns null for empty input', () => {
    expect(toExcerpt(null)).toBeNull();
    expect(toExcerpt(undefined)).toBeNull();
    expect(toExcerpt('')).toBeNull();
    expect(toExcerpt('   \n ')).toBeNull();
  });

  it('trims and bounds to 600 characters', () => {
    expect(toExcerpt(`  ${'a'.repeat(900)}  `)).toHaveLength(600);
  });

  it('strips URL query strings but keeps the address', () => {
    expect(toExcerpt('see https://example.org/a/b?token=abc&x=1 for more')).toBe(
      'see https://example.org/a/b for more',
    );
  });

  it('removes obvious secrets', () => {
    const text = 'key sk-abcdefghijklmnopqrstuv and Bearer abcdefghijklmnop and api_key=hunter2';
    const result = toExcerpt(text) ?? '';
    expect(result).not.toContain('sk-abcdefghijklmnopqrstuv');
    expect(result).not.toContain('abcdefghijklmnop');
    expect(result).not.toContain('hunter2');
    expect(result).toContain('[redacted]');
  });
});

describe('toExcerpt JSON secrets', () => {
  it('removes JSON-quoted secret keys and their quoted values', () => {
    const result =
      toExcerpt(
        '{"password": "hunter 2", "apiKey":"abc123", ' + "'token': 't0k', " + '"ok": "kept"}',
      ) ?? '';
    expect(result).not.toContain('hunter');
    expect(result).not.toContain('abc123');
    expect(result).not.toContain('t0k');
    expect(result).toContain('"ok": "kept"');
  });
});

describe('toExcerpt prefixed secrets', () => {
  it.each([
    ['access_token=zz9top', 'zz9top'],
    ['refresh_token: "zz9top"', 'zz9top'],
    ['client_secret=zz9top', 'zz9top'],
    ['password=zz9top', 'zz9top'],
    ['api_key=zz9top', 'zz9top'],
    ['{"access_token":"zz9top"}', 'zz9top'],
  ])('redacts %s', (text, secret) => {
    const result = toExcerpt(text) ?? '';
    expect(result).not.toContain(secret);
    expect(result).toContain('[redacted]');
  });

  it('keeps a plain sentence that mentions the word token', () => {
    const text = 'The model ran out of token budget for this step';
    expect(toExcerpt(text)).toBe(text);
  });
});

describe('roleStepInfo', () => {
  it.each([
    ['author-author-1', 'AUTHOR_DRAFTS', 'AUTHOR'],
    ['consensus-author-author-1', 'CONSENSUS', 'AUTHOR'],
    ['revision-author-author-1', 'REVISION', 'AUTHOR'],
    ['judge', 'JUDGE', 'JUDGE'],
    ['critic', 'CRITIC', 'CRITIC'],
    ['other', 'SYSTEM', 'SYSTEM'],
  ])('maps %s', (key, stage, roleKind) => {
    expect(roleStepInfo(key)).toEqual({ stage, roleKind });
  });
});
