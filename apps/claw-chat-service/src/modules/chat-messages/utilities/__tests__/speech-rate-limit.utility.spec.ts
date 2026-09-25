import { SpeechProviderError } from '../../../../common/errors';
import {
  geminiRetryDelayMs,
  isGeminiRateLimited,
  isOpenAiRateLimited,
  isSpeechRateLimited,
  parseRetryDelayMs,
  rateLimitBackoffMs,
} from '../speech-rate-limit.utility';

// Rate-limit helpers for "Read aloud" (2026-09-25): a Gemini 429 in 339 ms
// with 3 segments in flight dropped a segment. These decide what is a rate
// limit and how long to wait before retrying the same provider.

const RETRY_INFO = 'type.googleapis.com/google.rpc.RetryInfo';

describe('parseRetryDelayMs', () => {
  it.each([
    ['7s', 7_000],
    ['1.5s', 1_500],
    ['0s', 0],
    ['7', 7_000],
    [' 12 ', 12_000],
  ])('reads %j as %d ms', (value, expected) => {
    expect(parseRetryDelayMs(value, 0)).toBe(expected);
  });

  it('reads an HTTP-date Retry-After relative to now, never negative', () => {
    const now = Date.parse('2026-09-25T12:00:00Z');
    expect(parseRetryDelayMs('Fri, 25 Sep 2026 12:00:05 GMT', now)).toBe(5_000);
    expect(parseRetryDelayMs('Fri, 25 Sep 2026 11:59:00 GMT', now)).toBe(0);
  });

  it.each([null, undefined, '', '   ', 'soon', '-3s'])('is null for %j', (value) => {
    expect(parseRetryDelayMs(value, 0)).toBeNull();
  });
});

describe('geminiRetryDelayMs', () => {
  it('reads the RetryInfo detail, ignoring the others', () => {
    expect(
      geminiRetryDelayMs({
        status: 'RESOURCE_EXHAUSTED',
        details: [
          { '@type': 'type.googleapis.com/google.rpc.QuotaFailure' },
          { '@type': RETRY_INFO, retryDelay: '7s' },
        ],
      }),
    ).toBe(7_000);
  });

  it('is null without a RetryInfo detail or a body', () => {
    expect(geminiRetryDelayMs({ status: 'RESOURCE_EXHAUSTED', details: [] })).toBeNull();
    expect(geminiRetryDelayMs(undefined)).toBeNull();
  });
});

describe('isGeminiRateLimited / isOpenAiRateLimited', () => {
  it.each([
    [429, undefined, true],
    [400, { status: 'RESOURCE_EXHAUSTED' }, true],
    [400, { status: 'INVALID_ARGUMENT' }, false],
    [503, undefined, false],
  ])('Gemini %d %j → %s', (status, error, expected) => {
    expect(isGeminiRateLimited(status, error)).toBe(expected);
  });

  it('an OpenAI 429 is a rate limit, but an exhausted billing quota is not', () => {
    const rate = Buffer.from('{"error":{"type":"requests","code":"rate_limit_exceeded"}}');
    const quota = Buffer.from(
      '{"error":{"type":"insufficient_quota","code":"insufficient_quota"}}',
    );
    expect(isOpenAiRateLimited(429, rate)).toBe(true);
    expect(isOpenAiRateLimited(429, quota)).toBe(false);
    expect(isOpenAiRateLimited(500, rate)).toBe(false);
  });

  it('isSpeechRateLimited is true only for a rate-limited SpeechProviderError', () => {
    expect(isSpeechRateLimited(new SpeechProviderError('x', 429, false, true, null))).toBe(true);
    expect(isSpeechRateLimited(new SpeechProviderError('x', 503, false))).toBe(false);
    expect(isSpeechRateLimited(new Error('x'))).toBe(false);
  });

  it('a hint is kept only on a rate-limited error', () => {
    expect(new SpeechProviderError('x', 429, false, true, 7_000).retryAfterMs).toBe(7_000);
    expect(new SpeechProviderError('x', 500, false, false, 7_000).retryAfterMs).toBeNull();
  });
});

describe('rateLimitBackoffMs', () => {
  it.each([
    [1, 0.5, 1_500],
    [2, 0.5, 3_000],
    [3, 0.5, 6_000],
    [1, 0, 1_200],
    [1, 0.999_999, 1_800],
    [3, 0.999_999, 7_200],
    [5, 0.5, 24_000],
    [7, 0.5, 45_000],
  ])('retry %d with random %d waits %d ms', (retry, random, expected) => {
    expect(rateLimitBackoffMs(retry, null, random)).toBe(expected);
  });

  it('honours the provider hint exactly, with no jitter', () => {
    expect(rateLimitBackoffMs(1, 7_000, 0)).toBe(7_000);
    expect(rateLimitBackoffMs(3, 0, 0.9)).toBe(0);
    expect(rateLimitBackoffMs(1, 10_000, 0.5)).toBe(10_000);
  });

  it('honours a per-minute hint up to the 45 s cap', () => {
    expect(rateLimitBackoffMs(1, 29_808, 0.5)).toBe(29_808);
    expect(rateLimitBackoffMs(1, 45_000, 0.5)).toBe(45_000);
  });

  it('a hint above the 45 s cap cannot be honoured: null (move on)', () => {
    expect(rateLimitBackoffMs(1, 45_001, 0.5)).toBeNull();
    // A spent DAILY quota (seen live 2026-09-25: retryDelay ~29,808 s).
    expect(rateLimitBackoffMs(1, 29_808_000, 0.5)).toBeNull();
  });
});
