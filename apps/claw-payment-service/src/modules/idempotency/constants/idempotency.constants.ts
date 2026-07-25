export const IDEMPOTENCY_STATUS_IN_PROGRESS = 'IN_PROGRESS';
export const IDEMPOTENCY_STATUS_COMPLETED = 'COMPLETED';

// How long a key stays reserved. Long enough to cover any realistic client
// retry window, short enough that the table does not grow without bound.
export const IDEMPOTENCY_RETENTION_MS = 24 * 60 * 60 * 1000;
