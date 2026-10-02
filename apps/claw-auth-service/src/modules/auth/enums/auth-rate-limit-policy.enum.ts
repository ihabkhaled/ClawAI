/**
 * One budget per public sign-in / sign-up route (rules/58, ADR-147).
 *
 * Each route has its OWN policy, so spending the password-reset budget never
 * blocks a sign-in. The value is part of the Redis key: renaming one resets
 * that route's live windows, which is harmless.
 */
export enum AuthRateLimitPolicy {
  LOGIN = 'login',
  REGISTER = 'register',
  REFRESH = 'refresh',
  PASSWORD_RESET_REQUEST = 'password-reset-request',
  PASSWORD_RESET_CONFIRM = 'password-reset-confirm',
  EMAIL_VERIFICATION_RESEND = 'email-verification-resend',
  EMAIL_VERIFICATION_CONFIRM = 'email-verification-confirm',
  EMAIL_CHANGE_CONFIRM = 'email-change-confirm',
  VSCODE_AUTHORIZE_INIT = 'vscode-authorize-init',
  VSCODE_AUTHORIZE_EXCHANGE = 'vscode-authorize-exchange',
}
