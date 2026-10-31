/** "My Threads" list paging and search limits (ADR-205). */
export const OWNER_PAGE_DEFAULT_SIZE = 10;
export const OWNER_PAGE_MAX_SIZE = 50;
export const OWNER_PAGE_MAX_PAGE = 100_000;
export const OWNER_PAGE_QUERY_MAX_CHARS = 100;

export const OWNER_PAGE_STATUS_FILTERS = [
  'ALL',
  'GENERATING',
  'READY',
  'PUBLISHED',
  'FAILED',
] as const;

/** The status a row of the list reports; the same four values the filter accepts besides ALL. */
export type OwnerPageStatus = Exclude<(typeof OWNER_PAGE_STATUS_FILTERS)[number], 'ALL'>;

/** A job still marked GENERATING is read again from the generation service after this long. */
export const OWNER_PAGE_STATE_STALE_MS = 30_000;
/** Most unresolved rows one list request reads upstream, and how many reads run at once. */
export const OWNER_PAGE_RECONCILE_LIMIT = 20;
export const OWNER_PAGE_RECONCILE_CONCURRENCY = 5;
/** One upstream read may not hold a list request longer than this. */
export const OWNER_PAGE_RECONCILE_TIMEOUT_MS = 4_000;

/** Failure codes this list owns (the generation service owns every other code). */
export const OWNER_PAGE_CODE_JOB_CANCELLED = 'JOB_CANCELLED';
export const OWNER_PAGE_CODE_JOB_MISSING = 'GENERATION_JOB_MISSING';
export const OWNER_PAGE_CODE_REVOKED = 'PUBLICATION_REVOKED';
export const OWNER_PAGE_CODE_FAILED = 'GENERATION_FAILED';
export const OWNER_PAGE_SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;

/** A stored job state that carries no failure. */
export const OWNER_PAGE_NO_FAILURE = {
  failureCode: null,
  failureStep: null,
  failureRetryable: null,
} as const;
