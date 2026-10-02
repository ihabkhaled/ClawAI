/**
 * The per-field reason the API refused a sign-up payload.
 *
 * Mirrors `RegisterValidationIssue` in
 * apps/claw-auth-service/src/modules/auth/enums — the values arrive in the
 * `errors` map of a VALIDATION_FAILED 400 and are mapped to translated copy
 * beside the field (REGISTER_ISSUE_MESSAGE_KEYS). Keep the two in step.
 */
export enum RegisterValidationIssue {
  EMAIL_INVALID = 'EMAIL_INVALID',
  EMAIL_TOO_LONG = 'EMAIL_TOO_LONG',
  PASSWORD_TOO_SHORT = 'PASSWORD_TOO_SHORT',
  PASSWORD_TOO_LONG = 'PASSWORD_TOO_LONG',
  PASSWORD_NEEDS_UPPERCASE = 'PASSWORD_NEEDS_UPPERCASE',
  PASSWORD_NEEDS_LOWERCASE = 'PASSWORD_NEEDS_LOWERCASE',
  PASSWORD_NEEDS_NUMBER = 'PASSWORD_NEEDS_NUMBER',
  FIRST_NAME_REQUIRED = 'FIRST_NAME_REQUIRED',
  FIRST_NAME_TOO_LONG = 'FIRST_NAME_TOO_LONG',
  LAST_NAME_REQUIRED = 'LAST_NAME_REQUIRED',
  LAST_NAME_TOO_LONG = 'LAST_NAME_TOO_LONG',
  PHONE_INVALID = 'PHONE_INVALID',
}
