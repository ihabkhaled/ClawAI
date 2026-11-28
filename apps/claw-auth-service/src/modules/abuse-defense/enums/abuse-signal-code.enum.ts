/**
 * What an authenticated account did that is worth remembering (ADR-233).
 *
 * COUNTED codes can suspend the account: each is something the account's OWN valid
 * credential did. UNCOUNTED codes are evidence for an administrator only: a replayed
 * refresh token describes the victim of a theft, a sign-in on a banned device
 * describes a shared machine, and neither may ever punish the account it names.
 */
export enum AbuseSignalCode {
  /** The account's token hit a 429 on an authenticated route. */
  RATE_LIMIT_TRIPPED = 'RATE_LIMIT_TRIPPED',
  /** The account's token was refused by a role or permission guard (a probe of routes it may not use). */
  FORBIDDEN_PROBE = 'FORBIDDEN_PROBE',
  /** A service refused a URL the account asked it to fetch (SSRF guard). Reported over the internal route. */
  SSRF_REFUSED = 'SSRF_REFUSED',
  /** A refresh token was replayed after rotation: a stolen-token indicator. Never counted. */
  TOKEN_REUSE = 'TOKEN_REUSE',
  /** An existing account signed in on a device a permanently banned account used. Never counted. */
  BANNED_DEVICE_SIGNIN = 'BANNED_DEVICE_SIGNIN',
}
