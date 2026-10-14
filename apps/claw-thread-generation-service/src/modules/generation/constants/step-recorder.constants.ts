import {
  MODEL_CALL_CEILING_MESSAGE,
  MODEL_CALL_IDLE_MESSAGE,
  MODEL_HARD_CEILING_CODE,
  MODEL_IDLE_TIMEOUT_CODE,
  MODEL_STREAM_MALFORMED_MESSAGE,
  MODEL_STREAM_TRUNCATED_MESSAGE,
} from '../../models/constants/model-call.constants';

export const STEP_EXCERPT_MAX_CHARS = 600;
/** `failure_summary` is VARCHAR(400). */
export const FAILURE_SUMMARY_MAX_CHARS = 400;
export const STEP_APPEND_MAX_RETRIES = 5;
export const STEP_LIST_MAX = 500;
export const STEP_FALLBACK_ERROR_CODE = 'PROVIDER_ERROR';
export const STEP_CANCELLED_CODE = 'CANCELLED';
export const STEP_GENERATION_FAILED_CODE = 'GENERATION_FAILED';
export const STEP_FINAL_STAGE = 'GENERATION';
export const STEP_ERROR_CAUSE_DEPTH = 5;
export const STEP_REDACTED_MARK = '[redacted]';
export const STEP_LEASE_EXPIRED_CODE = 'LEASE_EXPIRED';
/** A job that waited in the queue past GENERATION_QUEUE_MAX_AGE_MS and was failed by the sweep. */
export const STEP_QUEUE_EXPIRED_CODE = 'QUEUE_EXPIRED';
export const STEP_RESUMED_CODE = 'RESUMED_FROM_CHECKPOINT';
export const STEP_ATTEMPT_TIMEOUT_CODE = 'GENERATION_ATTEMPT_TIMEOUT';
export const STEP_ATTEMPT_TIMEOUT_MESSAGE = 'Generation attempt exceeded its time limit';
export const MICRO_USD_DECIMALS = 6;
export const RETRY_CHAIN_MAX_DEPTH = 50;
export const RETRY_ALREADY_EXISTS_MESSAGE = 'This generation was already retried';

export const STEP_ROW_SELECT = {
  seq: true,
  at: true,
  stage: true,
  round: true,
  outcome: true,
  roleKind: true,
  roleId: true,
  provider: true,
  model: true,
  code: true,
  httpStatus: true,
  durationMs: true,
  inputTokens: true,
  outputTokens: true,
  excerpt: true,
} as const;

/** Owner-facing code and honest status for a provider outage. */
export const STEP_UPSTREAM_UNAVAILABLE_CODE = 'PROVIDER_UNAVAILABLE';
export const STEP_UPSTREAM_UNAVAILABLE_STATUS = 503;
/** Chat service codes that mean the provider is down; they sometimes arrive with a 400 status. */
export const UPSTREAM_UNAVAILABLE_CODES: ReadonlySet<string> = new Set([
  'CLOUD_PROVIDER_UNAVAILABLE',
  'PROVIDER_UNAVAILABLE',
]);
/**
 * PAYG refusals keep their own stable codes so the owner can tell a cap that is too low from spent
 * credit from a model with no price. They pass through `parseStepError` unchanged.
 */
export const PAYG_STEP_CODES: readonly string[] = [
  'PAYG_CAP_TOO_LOW',
  'PAYG_CREDIT_EXHAUSTED',
  'PAYG_PRICE_UNAVAILABLE',
  'PAYG_FREE_ALLOWANCE_EXHAUSTED',
];
/**
 * Codes only the owner can fix (a higher cap, more credit, a priced model). Every attempt would be
 * refused the same way and re-run the authors, so the job fails on the first attempt with the code.
 */
export const NON_RETRYABLE_STEP_CODES: ReadonlySet<string> = new Set([
  ...PAYG_STEP_CODES,
  'PAYG_MODEL_UNPRICED',
]);
/** Auth refuses an unpriced model with PAYG_MODEL_UNPRICED; a Thread step reports it as a missing price. */
export const STEP_UPSTREAM_CODE_ALIASES: ReadonlyMap<string, string> = new Map([
  ['PAYG_MODEL_UNPRICED', 'PAYG_PRICE_UNAVAILABLE'],
]);
export const STEP_FALLBACK_SKIPPED_CODE = 'FALLBACK_SKIPPED_SAME_PROVIDER';

export const UPSTREAM_STATUS_PATTERN =
  /Chat model request failed \((\d{3})(?:: ([A-Z][A-Z0-9_]{2,59})|)\)/u;

/** Message fragments written by this service, mapped to a stable machine code. */
export const STEP_MESSAGE_CODES: ReadonlyArray<{ fragment: string; code: string }> = [
  { fragment: 'Chat model gateway is unavailable', code: 'PROVIDER_UNAVAILABLE' },
  { fragment: MODEL_CALL_IDLE_MESSAGE, code: MODEL_IDLE_TIMEOUT_CODE },
  { fragment: MODEL_CALL_CEILING_MESSAGE, code: MODEL_HARD_CEILING_CODE },
  { fragment: MODEL_STREAM_TRUNCATED_MESSAGE, code: 'PROVIDER_UNAVAILABLE' },
  { fragment: MODEL_STREAM_MALFORMED_MESSAGE, code: 'PROVIDER_UNAVAILABLE' },
  { fragment: STEP_ATTEMPT_TIMEOUT_MESSAGE, code: STEP_ATTEMPT_TIMEOUT_CODE },
  { fragment: 'exceeds the model window', code: 'CONTEXT_WINDOW_EXCEEDED' },
  { fragment: 'exceeds the assumed model window', code: 'CONTEXT_WINDOW_ASSUMED' },
  { fragment: 'invalid structured output', code: 'OUTPUT_INVALID' },
  { fragment: 'returned an invalid', code: 'OUTPUT_INVALID' },
  { fragment: 'outside its evidence bundle', code: 'CITATION_INVALID' },
  { fragment: 'Research service is unavailable', code: 'RESEARCH_UNAVAILABLE' },
  { fragment: 'Research request failed', code: 'RESEARCH_FAILED' },
  { fragment: 'Research evidence response is invalid', code: 'RESEARCH_FAILED' },
  { fragment: 'Research returned no', code: 'RESEARCH_EMPTY' },
  { fragment: 'did not pass consensus and reviews', code: 'REVIEW_NOT_PASSED' },
  { fragment: 'Model catalog is unreachable', code: 'MODEL_CATALOG_UNREACHABLE' },
  { fragment: 'Model catalog rejected', code: 'MODEL_CATALOG_REJECTED' },
];

export const STEP_SECRET_PATTERNS: readonly RegExp[] = [
  /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}/gu,
  /\bAIza[A-Za-z0-9_-]{20,}/gu,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/gu,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{10,}/giu,
  /["']?\b[\w-]*(?:api[_-]?key|token|secret|password)\b["']?\s*[:=]\s*(?:"(?:[^"\\]|\\.)*"|'[^']*'|\S+)/giu,
];

export const STEP_URL_QUERY_PATTERN = /(https?:\/\/[^\s"'<>?#]+)\?[^\s"'<>#]*/gu;

/**
 * Failures the platform caused, so a job that ends this way with no draft does not consume the
 * Free allowance (auth refunds the meter money and the lifetime hold on PLATFORM_FAILED).
 * REVIEW_NOT_PASSED is deliberately absent (the models ran, the draft did not pass), as is
 * everything the owner can fix (NON_RETRYABLE_STEP_CODES) and every unknown code.
 */
export const PLATFORM_FAILURE_STEP_CODES: ReadonlySet<string> = new Set([
  'OUTPUT_INVALID',
  'PROVIDER_ERROR',
  'PROVIDER_UNAVAILABLE',
  'MODEL_IDLE_TIMEOUT',
  'MODEL_HARD_CEILING',
  'MODEL_REASONED_NO_ANSWER',
  'GENERATION_FAILED',
  'CANDIDATES_EXHAUSTED',
  'RESEARCH_FAILED',
  'RESEARCH_EMPTY',
  'RESEARCH_UNAVAILABLE',
  'GENERATION_ATTEMPT_TIMEOUT',
  'GENERATION_WORKER_LOST',
  STEP_QUEUE_EXPIRED_CODE,
  STEP_LEASE_EXPIRED_CODE,
]);
/**
 * Owner-facing PAYG codes that are STILL the platform's doing inside a Thread, so the close refunds
 * the lifetime Thread and the Free meter charge. A Thread call takes no request slot (ADR-162,
 * D-L2-04), so the free allowance running out under a Thread is the platform's own accounting (its
 * worst-case holds, retries and earlier failed answers), not something the owner chose. Production
 * 2026-10-14: a brand-new Free user lost the one Thread and 6,475 micro-USD to this code.
 * Every other PAYG code stays the owner's to fix (a higher cap, credit, a priced model).
 */
export const PLATFORM_ACCOUNTING_STEP_CODES: ReadonlySet<string> = new Set([
  'PAYG_FREE_ALLOWANCE_EXHAUSTED',
]);
/** Platform-caused families: CLOUD_PROVIDER_* and MODEL_CATALOG_*. */
export const PLATFORM_FAILURE_CODE_PREFIXES: readonly string[] = [
  'CLOUD_PROVIDER_',
  'MODEL_CATALOG_',
];
