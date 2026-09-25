/**
 * Why the circuit breaker is skipping a provider (ADR-125). Shown to the admin
 * as a code, translated by the frontend. Only account-wide credit exhaustion
 * trips it today; a per-request "can only afford N" never does.
 */
export enum ProviderBreakerReason {
  ACCOUNT_CREDIT_EXHAUSTED = 'ACCOUNT_CREDIT_EXHAUSTED',
}
