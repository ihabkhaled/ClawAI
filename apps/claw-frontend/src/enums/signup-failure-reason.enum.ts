/**
 * Why a sign-up attempt failed, as the register form explains it.
 *
 * One reason per distinct remedy: sign in instead, fix the fields, wait, retry
 * later, check the connection. UNKNOWN is the honest answer for anything not
 * recognised — never the most likely guess (rule 43 §2).
 */
export enum SignupFailureReason {
  EMAIL_TAKEN = 'EMAIL_TAKEN',
  INVALID_DETAILS = 'INVALID_DETAILS',
  RATE_LIMITED = 'RATE_LIMITED',
  ACCOUNT_SETUP_FAILED = 'ACCOUNT_SETUP_FAILED',
  /** A required bot check was missing (428): the browser check could not run. */
  BOT_CHECK_REQUIRED = 'BOT_CHECK_REQUIRED',
  /** A bot check was rejected (403): wrong, expired, reused or scored too low. */
  BOT_CHECK_FAILED = 'BOT_CHECK_FAILED',
  /** Platform-wide sign-up velocity exceeded (429 SIGNUP_TEMPORARILY_LIMITED). */
  SIGNUP_LIMITED = 'SIGNUP_LIMITED',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN',
}
