/**
 * The address-triggered emails that carry a send cooldown.
 *
 * These are the endpoints anyone can call with any address and cause an email
 * to be sent. They share one rate limiter (EmailDispatchCooldownService) so the
 * two can never drift apart — but they get SEPARATE windows, because confirming
 * an address and resetting a password are different things a user may
 * legitimately need minutes apart.
 */
export enum EmailDispatchPurpose {
  EMAIL_VERIFICATION = 'email-verification',
  PASSWORD_RESET = 'password-reset',
}
