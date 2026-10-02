/**
 * What a SUCCESSFUL request does to one of its windows (rules/58 item 10).
 *
 * Every attempt is counted up front, before any account lookup, so the
 * refusal is the same for every address (ADR-096). Only a success, which
 * already proves the caller knows the password, gives budget back, so
 * correct sign-ins never use up the limit that exists to stop wrong ones.
 *
 * - `RESET`: delete the counter (this caller, this account, is proven).
 * - `REFUND`: give this one hit back, keeping everyone else's hits on a
 *   shared address (an office NAT) counted.
 */
export enum AuthRateLimitSuccessAction {
  RESET = 'reset',
  REFUND = 'refund',
}
