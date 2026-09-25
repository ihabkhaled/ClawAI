import {
  BusinessException,
  ProviderCreditExhaustedException,
  ProviderOutputLimitException,
  ProviderRateLimitedException,
} from '../../../common/errors';
import {
  PROVIDER_ACCOUNT_EXHAUSTED_PATTERN,
  PROVIDER_AFFORDABLE_TOKENS_PATTERN,
  PROVIDER_CREDIT_MIN_OUTPUT_TOKENS,
  PROVIDER_CREDIT_SAFETY_DENOMINATOR,
  PROVIDER_CREDIT_SAFETY_NUMERATOR,
  PROVIDER_OUTPUT_LIMIT_EXCLUSIVE_PATTERN,
  PROVIDER_OUTPUT_LIMIT_MIN_RETRY_TOKENS,
  PROVIDER_OUTPUT_LIMIT_PATTERNS,
  PROVIDER_OUTPUT_LIMIT_SUBJECT_PATTERN,
  PROVIDER_RATE_LIMIT_BACKOFF_MS,
  PROVIDER_RATE_LIMIT_PATTERN,
  PROVIDER_REQUEST_CREDIT_PATTERN,
  PROVIDER_TEXT_MAX_CHARS,
  PROVIDER_TEXT_URL_PATTERN,
  PROVIDER_TEXT_URL_REPLACEMENT,
} from '../constants/provider-credit.constants';
import { type ProviderHttpFailureInput } from '../types/provider-http-failure.types';
import { type ProviderRetryPlan } from '../types/provider-retry.types';

/**
 * The one place a provider's non-2xx response becomes an error chat-service
 * throws. Every provider hop — buffered, streaming, the tool loop and
 * `generateOnce` — goes through here, so there is one rule for what a user can
 * ever read of a provider's own text.
 *
 * Production, 2026-09-25: OpenRouter answered 402 with a sentence ending in a
 * key-management URL containing the key hash. The streaming hop threw the raw
 * body truncated to 300 chars; truncation broke the JSON, so the chain's
 * envelope guard did not recognise it, and the whole thing was stored as the
 * assistant's reply. The buffered hop threw the nested `error.message`, URL
 * and all. Both now end here.
 */

function bodyText(body: unknown): string {
  if (typeof body === 'string') {
    return body;
  }
  if (body === undefined || body === null) {
    return '';
  }
  try {
    return JSON.stringify(body);
  } catch {
    return '';
  }
}

function parseBody(body: unknown): unknown {
  if (typeof body !== 'string') {
    return body;
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return undefined;
  }
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/** `message`, `error` (string) or `error.message` — the shapes providers use. */
function providerSentence(body: unknown): string | undefined {
  const parsed = parseBody(body);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return undefined;
  }
  const record = parsed as Record<string, unknown>;
  const error = record['error'];
  const nested =
    typeof error === 'object' && error !== null && !Array.isArray(error)
      ? nonEmptyString((error as Record<string, unknown>)['message'])
      : undefined;
  return nonEmptyString(record['message']) ?? nonEmptyString(error) ?? nested;
}

/** True when the text contains anything URL-shaped. */
export function carriesUrl(text: string): boolean {
  PROVIDER_TEXT_URL_PATTERN.lastIndex = 0;
  const found = PROVIDER_TEXT_URL_PATTERN.test(text);
  PROVIDER_TEXT_URL_PATTERN.lastIndex = 0;
  return found;
}

/** The token ceiling a provider said it would accept ("can only afford N"). */
export function parseAffordableOutputTokens(text: string | undefined): number | undefined {
  if (text === undefined) {
    return undefined;
  }
  const match = PROVIDER_AFFORDABLE_TOKENS_PATTERN.exec(text);
  const digits = match?.[1]?.replaceAll(',', '');
  if (digits === undefined || digits.length === 0) {
    return undefined;
  }
  const value = Number.parseInt(digits, 10);
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

/**
 * The single reactive retry's output ceiling: 90% of the provider's stated
 * ceiling, or `undefined` when there is nothing worth retrying — no stated
 * ceiling, not a credit error, or an answer too small to be useful.
 */
export function creditRetryCeiling(error: unknown): number | undefined {
  if (!(error instanceof ProviderCreditExhaustedException)) {
    return undefined;
  }
  const affordable = error.affordableOutputTokens;
  if (affordable === undefined) {
    return undefined;
  }
  const ceiling = Math.floor(
    (affordable * PROVIDER_CREDIT_SAFETY_NUMERATOR) / PROVIDER_CREDIT_SAFETY_DENOMINATOR,
  );
  return ceiling >= PROVIDER_CREDIT_MIN_OUTPUT_TOKENS ? ceiling : undefined;
}

/** True when the error says the provider ACCOUNT is out of credit (trips the breaker). */
export function isAccountExhaustion(error: unknown): boolean {
  return error instanceof ProviderCreditExhaustedException && error.accountExhausted;
}

/**
 * The chokepoint's one retry for a recoverable refusal, or undefined when a
 * retry cannot help (ADR-124, ADR-125).
 */
export function providerRetryPlan(error: unknown): ProviderRetryPlan | undefined {
  const creditCeiling = creditRetryCeiling(error);
  if (creditCeiling !== undefined) {
    return { reason: 'refused for provider-key credit', ceiling: creditCeiling };
  }
  if (error instanceof ProviderOutputLimitException) {
    return error.maxOutputTokens >= PROVIDER_OUTPUT_LIMIT_MIN_RETRY_TOKENS
      ? {
          reason: 'refused the requested output length',
          ceiling: error.maxOutputTokens,
          learnedMaxOutputTokens: error.maxOutputTokens,
        }
      : undefined;
  }
  return error instanceof ProviderRateLimitedException
    ? { reason: 'rate-limited upstream', delayMs: PROVIDER_RATE_LIMIT_BACKOFF_MS }
    : undefined;
}

/** Provider text safe for a log line: every URL replaced, length bounded. */
export function redactProviderText(body: unknown): string {
  const redacted = bodyText(body).replace(PROVIDER_TEXT_URL_PATTERN, PROVIDER_TEXT_URL_REPLACEMENT);
  return redacted.length > PROVIDER_TEXT_MAX_CHARS
    ? `${redacted.slice(0, PROVIDER_TEXT_MAX_CHARS - 3)}...`
    : redacted;
}

/**
 * The last guard before an error string is stored or shown: anything carrying
 * a URL is replaced whole. Redacting in place would still show a user a
 * provider's billing sentence; the fallback is a sentence we wrote.
 */
export function sanitizeUserFacingErrorMessage(message: string, fallback: string): string {
  const trimmed = message.trimStart();
  return carriesUrl(message) || trimmed.startsWith('{') || trimmed.startsWith('[')
    ? fallback
    : message;
}

/**
 * The text a lane/turn may store and show for a thrown error: our own
 * sentence, never a provider's JSON body or a URL (ADR-125 — compare and
 * consensus lanes stored `Error: {"error":...}` verbatim).
 */
export function userFacingErrorText(error: unknown, fallback: string): string {
  return error instanceof Error
    ? sanitizeUserFacingErrorMessage(error.message, fallback)
    : fallback;
}

function parsePositiveInteger(digits: string | undefined): number | undefined {
  const cleaned = digits?.replaceAll(',', '');
  if (cleaned === undefined || cleaned.length === 0) {
    return undefined;
  }
  const value = Number.parseInt(cleaned, 10);
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

/**
 * The model's real output ceiling, stated in a provider's refusal of the
 * requested `max_tokens` (ADR-125). `undefined` unless the text is about the
 * output cap — a too-long PROMPT ("maximum context length") never matches.
 */
export function parseProviderOutputLimit(text: string): number | undefined {
  if (!PROVIDER_OUTPUT_LIMIT_SUBJECT_PATTERN.test(text)) {
    return undefined;
  }
  const exclusive = parsePositiveInteger(PROVIDER_OUTPUT_LIMIT_EXCLUSIVE_PATTERN.exec(text)?.[1]);
  if (exclusive !== undefined) {
    return exclusive > 1 ? exclusive - 1 : undefined;
  }
  for (const pattern of PROVIDER_OUTPUT_LIMIT_PATTERNS) {
    const value = parsePositiveInteger(pattern.exec(text)?.[1]);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

/**
 * Order matters: credit first (OpenRouter's credit sentence also says
 * "fewer max_tokens"), then the output cap, then a rate limit (Gemini's
 * quota sentence links a "rate-limits" page, so it must already be credit).
 */
function classifyKnownFailure(
  input: ProviderHttpFailureInput,
  text: string,
): BusinessException | undefined {
  if (PROVIDER_ACCOUNT_EXHAUSTED_PATTERN.test(text)) {
    return new ProviderCreditExhaustedException(undefined, true);
  }
  if (input.status === 402 || PROVIDER_REQUEST_CREDIT_PATTERN.test(text)) {
    return new ProviderCreditExhaustedException(parseAffordableOutputTokens(text));
  }
  const outputLimit = parseProviderOutputLimit(text);
  if (outputLimit !== undefined) {
    return new ProviderOutputLimitException(outputLimit, input.failureCode);
  }
  return input.status === 429 || PROVIDER_RATE_LIMIT_PATTERN.test(text)
    ? new ProviderRateLimitedException(input.failureCode)
    : undefined;
}

export function toProviderHttpFailure(input: ProviderHttpFailureInput): BusinessException {
  const text = bodyText(input.body);
  const known = classifyKnownFailure(input, text);
  if (known !== undefined) {
    return known;
  }
  const sentence = providerSentence(input.body);
  const safe =
    sentence === undefined || carriesUrl(sentence) || sentence.length > PROVIDER_TEXT_MAX_CHARS
      ? input.fallbackMessage
      : sentence;
  return new BusinessException(safe, input.failureCode);
}
