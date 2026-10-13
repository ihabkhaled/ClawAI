export const STEP_EXCERPT_MAX_CHARS = 600;
export const STEP_APPEND_MAX_RETRIES = 5;
export const STEP_LIST_MAX = 500;
export const STEP_FALLBACK_ERROR_CODE = 'PROVIDER_ERROR';
export const STEP_CANCELLED_CODE = 'CANCELLED';
export const STEP_GENERATION_FAILED_CODE = 'GENERATION_FAILED';
export const STEP_FINAL_STAGE = 'GENERATION';
export const STEP_ERROR_CAUSE_DEPTH = 5;
export const STEP_REDACTED_MARK = '[redacted]';
export const STEP_LEASE_EXPIRED_CODE = 'LEASE_EXPIRED';
export const STEP_RESUMED_CODE = 'RESUMED_FROM_CHECKPOINT';
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

export const UPSTREAM_STATUS_PATTERN =
  /Chat model request failed \((\d{3})(?:: ([A-Z][A-Z0-9_]{2,59})|)\)/u;

/** Message fragments written by this service, mapped to a stable machine code. */
export const STEP_MESSAGE_CODES: ReadonlyArray<{ fragment: string; code: string }> = [
  { fragment: 'Chat model gateway is unavailable', code: 'PROVIDER_UNAVAILABLE' },
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
