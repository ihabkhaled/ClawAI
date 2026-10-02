import { RegisterValidationIssue } from '@/enums/register-validation-issue.enum';
import type { PasswordRule, RegisterServerField } from '@/types';

/**
 * Translated copy for each per-field code the API can return in a
 * VALIDATION_FAILED body. Typed as a full Record so a new backend code that is
 * added to the enum cannot ship without copy.
 */
export const REGISTER_ISSUE_MESSAGE_KEYS: Readonly<Record<RegisterValidationIssue, string>> = {
  [RegisterValidationIssue.EMAIL_INVALID]: 'auth.signup.emailInvalid',
  [RegisterValidationIssue.EMAIL_TOO_LONG]: 'auth.signup.emailTooLong',
  [RegisterValidationIssue.PASSWORD_TOO_SHORT]: 'auth.signup.passwordTooShort',
  [RegisterValidationIssue.PASSWORD_TOO_LONG]: 'auth.signup.passwordTooLong',
  [RegisterValidationIssue.PASSWORD_NEEDS_UPPERCASE]: 'auth.signup.passwordNeedsUppercase',
  [RegisterValidationIssue.PASSWORD_NEEDS_LOWERCASE]: 'auth.signup.passwordNeedsLowercase',
  [RegisterValidationIssue.PASSWORD_NEEDS_NUMBER]: 'auth.signup.passwordNeedsNumber',
  [RegisterValidationIssue.FIRST_NAME_REQUIRED]: 'auth.signup.firstNameRequired',
  [RegisterValidationIssue.FIRST_NAME_TOO_LONG]: 'auth.signup.firstNameTooLong',
  [RegisterValidationIssue.LAST_NAME_REQUIRED]: 'auth.signup.lastNameRequired',
  [RegisterValidationIssue.LAST_NAME_TOO_LONG]: 'auth.signup.lastNameTooLong',
  [RegisterValidationIssue.PHONE_INVALID]: 'auth.signup.phoneInvalid',
};

/**
 * Copy for a field the API flagged with a code this client does not know
 * (an older client against a newer API). Still names the field, still says
 * what to do — never the raw backend text.
 */
export const REGISTER_FIELD_FALLBACK_KEYS: Readonly<Record<RegisterServerField, string>> = {
  firstName: 'auth.signup.firstNameRequired',
  lastName: 'auth.signup.lastNameRequired',
  email: 'auth.signup.emailInvalid',
  phone: 'auth.signup.phoneInvalid',
  password: 'auth.signup.passwordWeak',
};

/**
 * The password floor, shown live under the field. The same four rules the
 * schema enforces and the auth-service's validatePasswordStrength checks, so
 * a ticked list means the server will accept it.
 */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  { id: 'length', labelKey: 'auth.signup.ruleLength', pattern: /^[\s\S]{8,128}$/u },
  { id: 'uppercase', labelKey: 'auth.signup.ruleUppercase', pattern: /[A-Z]/u },
  { id: 'lowercase', labelKey: 'auth.signup.ruleLowercase', pattern: /[a-z]/u },
  { id: 'number', labelKey: 'auth.signup.ruleNumber', pattern: /\d/u },
] as const;

// Statuses the sign-up classifier reads when a response carries no code: the
// throttler's 429, a 400 with a field map, and the 0 an unreachable API gives.
export const SIGNUP_HTTP_BAD_REQUEST = 400;
export const SIGNUP_HTTP_TOO_MANY_REQUESTS = 429;
export const NETWORK_FAILURE_STATUS = 0;
