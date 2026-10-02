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
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN',
}
