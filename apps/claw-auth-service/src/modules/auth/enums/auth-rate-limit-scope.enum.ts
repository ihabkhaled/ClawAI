/**
 * What a rate-limit window is counted against.
 *
 * - `IP`: the client address nginx saw (X-Real-IP).
 * - `EMAIL`: the normalized submitted address, whether or not an account exists.
 * - `IP_EMAIL`: the pair, so one attacker guessing one account is stopped early
 *   without blocking everyone else behind the same address.
 */
export enum AuthRateLimitScope {
  IP = 'ip',
  EMAIL = 'email',
  IP_EMAIL = 'ip-email',
}
