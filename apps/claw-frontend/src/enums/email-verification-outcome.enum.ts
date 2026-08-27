/**
 * What happened when a verification link was opened.
 *
 * `Verified` and `AlreadyHandled` used to be indistinguishable: the page bounced
 * to the login screen either way, so somebody whose account an administrator had
 * already activated saw the same silent redirect as somebody whose link had
 * expired. Now that an administrator can burn the token by activating the
 * account, that ambiguity has a real cause and needs a real answer.
 */
export enum EmailVerificationOutcome {
  Pending = 'PENDING',
  Verified = 'VERIFIED',
  /** The token was already consumed — by the user, or by an admin activation. */
  AlreadyHandled = 'ALREADY_HANDLED',
  /** No token in the URL, or the request itself failed. */
  Failed = 'FAILED',
}
