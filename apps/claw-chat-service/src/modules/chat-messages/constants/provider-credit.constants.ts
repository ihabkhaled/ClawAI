// A provider account that ran out of credit (OpenRouter's key limit, an
// exhausted prepaid balance). This is the OPERATOR's money at the provider, not
// the user's PAYG wallet — so it is deliberately NOT a 402: `isPaygRefusal`
// ends the whole candidate chain on a 402, while an empty OpenRouter key says
// nothing about the next provider in the chain.
export const PROVIDER_CREDIT_EXHAUSTED_CODE = 'PROVIDER_CREDIT_EXHAUSTED';

// The stored/logged English sentence. The user sees the translated
// `PROVIDER_CREDIT_EXHAUSTED_MESSAGE_KEY` wherever the frontend renders it; the
// provider's own text never reaches them (it carried a key-management URL).
export const PROVIDER_CREDIT_EXHAUSTED_MESSAGE =
  'This model’s provider is out of credit right now. Choose another model or try again later.';

export const PROVIDER_CREDIT_EXHAUSTED_MESSAGE_KEY = 'chat.errors.providerCreditExhausted';

// Below this many output tokens an answer is not worth starting: the reply
// would be cut off almost immediately and the user would still be charged for
// the prompt. The pre-flight check and the reactive retry both fail fast here.
export const PROVIDER_CREDIT_MIN_OUTPUT_TOKENS = 256;

// Integer safety ratio applied to an affordable token count (0.9 = 9/10). The
// provider's own estimate and ours differ by tokenizer; 10% slack keeps the
// retry from landing a few tokens over the line and failing again.
export const PROVIDER_CREDIT_SAFETY_NUMERATOR = 9;
export const PROVIDER_CREDIT_SAFETY_DENOMINATOR = 10;

// Distinct PAYG idempotency key for the one reactive retry (credit, output
// limit or rate limit). Reservation is idempotent on (userId, requestId):
// reusing the first attempt's key would hand back the hold that was just
// released instead of placing a new one (rule 37 §15).
export const PROVIDER_RETRY_REQUEST_SUFFIX = ':provider-retry';

// The provider ACCOUNT is out of money: every request on this key will fail
// until an operator tops it up, so the circuit breaker opens (ADR-125).
// OpenAI: "You have no credits remaining" / insufficient_quota; Anthropic:
// "Your credit balance is too low"; Gemini / OpenAI: "You exceeded your current
// quota"; DeepSeek: "Insufficient Balance"; xAI: "used all available credits"
// / "monthly spending limit".
export const PROVIDER_ACCOUNT_EXHAUSTED_PATTERN =
  /insufficient[_ ](?:credits?|quota|balance)|credit[_ ]balance(?:[_ ]is[_ ]too[_ ]low|[_ ]exhausted)|no credits remaining|out of credits?|exceeded your current quota|used all available credits|spending limit/iu;

// THIS request cannot be paid for, but a smaller or cheaper one could
// (OpenRouter: "requires more credits, or fewer max_tokens ... can only afford
// N"). No breaker: a :free model on the same key still works.
export const PROVIDER_REQUEST_CREDIT_PATTERN = /can only afford|requires more credits/iu;

// OpenRouter states the ceiling it would accept: "... but can only afford 9063".
// Digits may carry thousands separators in other locales of the same message.
export const PROVIDER_AFFORDABLE_TOKENS_PATTERN = /can only afford\s+(\d[\d,]*)/iu;

// Anything that looks like a URL. Provider bodies have carried billing links
// and key-management URLs containing a key hash; none may reach a user or a log.
// Stops at quotes and closing brackets so a URL inside a JSON string leaves
// the surrounding JSON intact.
export const PROVIDER_TEXT_URL_PATTERN = /https?:\/\/[^\s"'<>)\]}]+/giu;

export const PROVIDER_TEXT_URL_REPLACEMENT = '<url>';

// Upper bound on provider text kept for a log line or a safe user sentence.
export const PROVIDER_TEXT_MAX_CHARS = 300;

// What a user reads when a failure's own text was not safe to repeat.
export const PROVIDER_REQUEST_FAILED_MESSAGE =
  'The AI provider could not complete this request. Please try again shortly.';

// connector-service: the executing key's remaining provider credit.
export const PROVIDER_CREDIT_HEADROOM_PATH = '/api/v1/internal/connectors/credit-headroom';

// connector-service reads the provider's two credit endpoints in parallel at
// 2.5 s each on a cache miss; anything slower is treated as "unknown" and the
// call proceeds with no pre-flight cap (the provider still enforces).
export const PROVIDER_CREDIT_HEADROOM_TIMEOUT_MS = 3_500;

// routing-service: the model's rate card — the same source the PAYG meter
// prices from (ADR-079). `connector_models` price columns are not populated
// for aggregator catalogues, so they cannot be the source here.
export const PROVIDER_RATE_PATH_PREFIX = '/api/v1/internal/router-models/costs';

export const PROVIDER_RATE_TIMEOUT_MS = 2_000;

// A model's price changes only when an operator republishes it.
export const PROVIDER_RATE_CACHE_TTL_MS = 300_000;

export const PROVIDER_RATE_CACHE_MAX_ENTRIES = 512;

// ── Output-limit refusals (ADR-125) ───────────────────────────────────────

export const PROVIDER_OUTPUT_LIMIT_MESSAGE =
  'This model could not produce an answer of the requested length. Please try again.';

export const PROVIDER_OUTPUT_LIMIT_MESSAGE_KEY = 'chat.errors.providerOutputLimit';

// A refusal is only read as an output-limit refusal when it names the output
// cap — "maximum context length" (the PROMPT is too long) must never be
// mistaken for it.
export const PROVIDER_OUTPUT_LIMIT_SUBJECT_PATTERN =
  /max[_ ]?(?:completion[_ ])?tokens|maxOutputTokens|output tokens|completion tokens/iu;

// Each provider's wording, capture group 1 = the model's real ceiling.
// Groq:      "`max_tokens` must be less than or equal to `16384`, ..."
// Ollama:    "max_tokens (32768) exceeds model's maximum output tokens (16384) ..."
// OpenAI:    "This model supports at most 16384 completion tokens, whereas ..."
// Anthropic: "max_tokens: 32768 > 8192, which is the maximum allowed ..."
// generic:   "... maximum output tokens is 8192" / "maximum completion tokens: 8192"
export const PROVIDER_OUTPUT_LIMIT_PATTERNS: readonly RegExp[] = [
  /less than or equal to\s*`?(\d[\d,]*)`?/iu,
  /maximum output tokens\s*\(\s*(\d[\d,]*)\s*\)/iu,
  /supports at most\s+(\d[\d,]*)\s+completion tokens/iu,
  /max_tokens:\s*\d[\d,]*\s*>\s*(\d[\d,]*)/iu,
  /maximum[^.\d]{0,30}(?:output|completion)[ _-]*tokens?\s*(?:is|of|:|=)\s*(\d[\d,]*)/iu,
];

// Gemini: "... maxOutputTokens value of 100000 but the supported range is from
// 1 (inclusive) to 65537 (exclusive)." — the ceiling is the bound minus one.
export const PROVIDER_OUTPUT_LIMIT_EXCLUSIVE_PATTERN =
  /supported range is from\s*\d+\s*\(inclusive\)\s*to\s*(\d[\d,]*)\s*\(exclusive\)/iu;

// connector-service: remembers a learned ceiling on the model row.
export const PROVIDER_OUTPUT_LIMIT_RECORD_PATH = '/api/v1/internal/connectors/models/output-limit';

export const PROVIDER_OUTPUT_LIMIT_RECORD_TIMEOUT_MS = 2_000;

export const PROVIDER_OUTPUT_LIMIT_CACHE_MAX_ENTRIES = 1_024;

// A stated ceiling this small is a mis-parse or a model unusable for chat;
// retrying with it would only return a stub, so it is not retried.
export const PROVIDER_OUTPUT_LIMIT_MIN_RETRY_TOKENS = 64;

// ── Transient upstream rate limits (ADR-125) ──────────────────────────────

export const PROVIDER_RATE_LIMITED_MESSAGE =
  'This model is busy at its provider right now. Try again in a moment or choose another model.';

export const PROVIDER_RATE_LIMITED_MESSAGE_KEY = 'chat.errors.providerRateLimited';

// OpenRouter ":free": "... is temporarily rate-limited upstream. Please retry shortly".
export const PROVIDER_RATE_LIMIT_PATTERN = /rate[- ]?limit|too many requests/iu;

// One short wait before the single retry. Short on purpose: this sits inside a
// user's turn, and a longer outage is what the next candidate is for.
export const PROVIDER_RATE_LIMIT_BACKOFF_MS = 1_500;

// ── Account-exhaustion circuit breaker (ADR-125) ──────────────────────────

// How long a provider whose ACCOUNT is out of credit is skipped. After it, ONE
// call probes (half-open); success closes the breaker, another exhaustion
// re-opens it for the same period.
export const PROVIDER_BREAKER_OPEN_MS = 600_000;
