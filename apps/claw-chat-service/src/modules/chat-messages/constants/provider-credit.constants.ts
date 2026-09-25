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

// Distinct PAYG idempotency key for the one reactive retry. Reservation is
// idempotent on (userId, requestId): reusing the first attempt's key would hand
// back the hold that was just released instead of placing a new one (rule 37 §15).
export const PROVIDER_CREDIT_RETRY_REQUEST_SUFFIX = ':credit-retry';

// Text that marks a provider refusal as a credit/balance problem rather than a
// malformed request. OpenRouter: "requires more credits ... can only afford N";
// OpenAI: insufficient_quota; Anthropic: credit_balance_exhausted / "credit
// balance is too low".
export const PROVIDER_CREDIT_FAILURE_PATTERN =
  /can only afford|requires more credits|insufficient[_ ](?:credits?|quota|balance)|credit[_ ]balance|out of credits?|no credits remaining/iu;

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
