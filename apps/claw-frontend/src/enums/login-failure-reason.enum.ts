/**
 * Why a sign-in attempt was refused, as far as the user is allowed to know.
 *
 * There are deliberately only four, and `INVALID_CREDENTIALS` deliberately
 * covers both "no such address" and "wrong password". That is not the frontend
 * being vague — the backend returns one identical response for both cases on
 * purpose, so that the login form cannot be used to find out which addresses
 * have accounts (ADR-096). Splitting them here would be inventing information
 * we were never given.
 *
 * `EMAIL_NOT_VERIFIED` and `ACCOUNT_SUSPENDED` are different: the server only
 * ever returns them once the password has already verified, so the person
 * reading the message has proved the account is theirs.
 */
export enum LoginFailureReason {
  /** Wrong address or wrong password — indistinguishable by design. */
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  /** Correct password, address never confirmed. The user can fix this. */
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  /** Correct password, account disabled by an administrator. */
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  /** Network failure, a 500, anything we cannot attribute. */
  UNKNOWN = 'UNKNOWN',
}
