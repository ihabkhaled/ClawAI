/**
 * Canonical failure vocabulary for a router-inference attempt.
 *
 * Every provider fails differently — a 429 here, a typed quota error there, a
 * socket hangup somewhere else — but the chain has to decide identically:
 * retry, move to the next entry, skip the whole provider, or stop. Adapters
 * translate into these codes and nothing downstream ever branches on a provider
 * string or an HTTP status again.
 *
 * Deliberately distinct pairs:
 * - AUTHENTICATION_FAILED (401, bad credential) vs AUTHORIZATION_FAILED (403,
 *   valid credential without entitlement). Both stop retrying, but only the
 *   second usually means "this account cannot use this model".
 * - MODEL_NOT_FOUND (typo or wrong id) vs MODEL_RETIRED (was valid, has been
 *   withdrawn). Both quarantine the deployment; only the second is expected.
 * - LOW_CONFIDENCE is not a provider failure at all — the call succeeded and
 *   returned a valid decision nobody trusts. It follows the escalation policy,
 *   not the fallback ladder.
 */
export enum RouterErrorCode {
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  PROVIDER_5XX = 'PROVIDER_5XX',
  NETWORK = 'NETWORK',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  MODEL_RETIRED = 'MODEL_RETIRED',
  CAPABILITY_MISMATCH = 'CAPABILITY_MISMATCH',
  MALFORMED_STRUCTURED_OUTPUT = 'MALFORMED_STRUCTURED_OUTPUT',
  LOW_CONFIDENCE = 'LOW_CONFIDENCE',
  CANCELLED = 'CANCELLED',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  POLICY_BLOCKED = 'POLICY_BLOCKED',
  UNKNOWN = 'UNKNOWN',
}
