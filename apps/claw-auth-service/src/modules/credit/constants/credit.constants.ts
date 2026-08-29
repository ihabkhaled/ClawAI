import { PAYG_RESERVATION_SWEEP_INTERVAL_MS } from '@claw/shared-constants';

// ── Internal HTTP: routing-service model prices (ADR-079) ───────────────────

export const MODEL_COST_PATH_PREFIX = '/api/v1/router-models/costs';

// Deliberately short. This call sits in front of a provider request, and a
// slow price lookup must not become the reason a chat feels slow. On timeout
// the PAYG path fails CLOSED rather than waiting: refusing one request is
// cheaper than serving an unpriced one.
export const MODEL_COST_TIMEOUT_MS = 3_000;

// ── Internal HTTP: connector-service PAYG policy ────────────────────────────

export const CONNECTOR_PAYG_POLICY_PATH = '/api/v1/internal/connectors/payg-policy';
export const CONNECTOR_PAYG_POLICY_TIMEOUT_MS = 3_000;

// ── Scheduled jobs ──────────────────────────────────────────────────────────

// The sweeper reclaims holds a dead request abandoned.
export const CREDIT_SWEEP_INTERVAL_MS = PAYG_RESERVATION_SWEEP_INTERVAL_MS;

// Grant renewal runs on a DIFFERENT interval from the sweep, and the two hold
// DIFFERENT lock keys, so a cold boot cannot fire both in the same tick and
// have the slower one skipped as "contended" every single time. 7 minutes and
// 5 minutes share no small common multiple, so they drift apart instead of
// locking step.
export const CREDIT_GRANT_RENEWAL_INTERVAL_MS = 7 * 60 * 1000;

// Lock TTL must exceed the longest plausible run. A batch of 200 wallet
// transactions is seconds, not minutes; two minutes leaves headroom for a
// loaded database without wedging the schedule if the container dies.
export const CREDIT_JOB_LOCK_TTL_SECONDS = 120;

// Bounded so one tick cannot hold a database connection for minutes. Whatever
// is left over is picked up by the next tick — the work is idempotent.
export const CREDIT_SWEEP_BATCH_SIZE = 200;
export const CREDIT_GRANT_RENEWAL_BATCH_SIZE = 200;

// ── Ledger / API bounds ─────────────────────────────────────────────────────

export const CREDIT_REQUEST_ID_MAX_LENGTH = 128;
export const CREDIT_USER_ID_MAX_LENGTH = 64;
export const CREDIT_PROVIDER_MAX_LENGTH = 64;
export const CREDIT_MODEL_MAX_LENGTH = 256;
export const CREDIT_WORKFLOW_MAX_LENGTH = 64;
export const CREDIT_TOKEN_COUNT_MAX = 10_000_000;
export const CREDIT_MAX_OUTPUT_TOKENS_MAX = 1_000_000;
export const CREDIT_CALL_COUNT_MAX = 1_000;
export const CREDIT_PACKAGE_ID_MAX_LENGTH = 64;
export const CREDIT_EVENT_ID_MAX_LENGTH = 200;
// 19 digits is BIGINT's ceiling. A longer figure could not be stored, so
// refusing it at the schema is refusing it before it becomes a wrong balance.
export const CREDIT_MICRO_USD_DIGITS_MAX = 19;
export const CREDIT_PACKAGE_SLUG_MAX_LENGTH = 64;
export const CREDIT_PACKAGE_PRICE_MINOR_MAX = 1_000_000;
