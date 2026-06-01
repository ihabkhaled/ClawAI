export const VERIFIER_POLL_INTERVAL_MS = 2000;
export const MAX_VERIFIER_POLL_COUNT = 90;
export const VERIFIER_POLL_MESSAGES_LIMIT = 10;
export const VERIFIER_CONTENT_MIN_LENGTH = 10;

// Options the user can pick in the "Max revisions" select on the verify
// lab page. Extracted so the page itself stays a pure render shell and
// does not declare a module-level array inline.
export const VERIFIER_MAX_REVISIONS_OPTIONS: readonly number[] = [0, 1, 2, 3];

// Default number of revisions the verifier manager will attempt before
// returning the best candidate. Picked to match the BE default.
export const VERIFIER_DEFAULT_MAX_REVISIONS = 1;
