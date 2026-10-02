/**
 * The stable per-field reason a sign-up payload was refused.
 *
 * These travel as the zod issue message, so the `errors` map of a 400 reads
 * `{ password: ['PASSWORD_NEEDS_UPPERCASE'] }` instead of an English sentence.
 * The web client maps each value to translated copy beside the right field
 * (rule 43 §2: a backend message is never rendered to a user). Mirrored by
 * `RegisterValidationIssue` in apps/claw-frontend/src/enums — keep in step.
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
