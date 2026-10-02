/**
 * One budget per public device sign-in route (rules/58, ADR-147). The value is
 * part of the Redis key.
 */
export enum AgentAuthRateLimitPolicy {
  PAIR_INIT = 'pair-init',
  PAIR_POLL = 'pair-poll',
  DEVICE_CODE_CREATE = 'device-code-create',
  REFRESH = 'refresh',
  SSO_CALLBACK = 'sso-callback',
}
