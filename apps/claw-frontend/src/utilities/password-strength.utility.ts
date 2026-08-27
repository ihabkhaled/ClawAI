import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_STRENGTH_LONG_LENGTH,
} from '@/constants/password-generator.constants';
import { PasswordStrengthLevel } from '@/enums/password-strength-level.enum';
import type { PasswordRequirementState, PasswordStrengthResult } from '@/types';

function evaluateRequirements(password: string): PasswordRequirementState {
  return {
    hasMinLength: password.length >= PASSWORD_MIN_LENGTH,
    withinMaxLength: password.length <= PASSWORD_MAX_LENGTH,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasDigit: /\d/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  };
}

function resolveLevel(meetsPolicy: boolean, length: number): PasswordStrengthLevel {
  if (!meetsPolicy) {return PasswordStrengthLevel.Weak;}
  if (length >= PASSWORD_STRENGTH_LONG_LENGTH) {return PasswordStrengthLevel.Strong;}
  if (length >= PASSWORD_MIN_LENGTH + 4) {return PasswordStrengthLevel.Good;}
  return PasswordStrengthLevel.Fair;
}

const SCORE_BY_LEVEL: Record<PasswordStrengthLevel, number> = {
  [PasswordStrengthLevel.Weak]: 1,
  [PasswordStrengthLevel.Fair]: 2,
  [PasswordStrengthLevel.Good]: 3,
  [PasswordStrengthLevel.Strong]: 4,
};

/**
 * Scores a candidate password against the admin create-user policy.
 *
 * Deliberately mirrors the backend rather than inventing its own idea of
 * strength: the two layers previously disagreed — `validatePasswordStrength`
 * wanted upper, lower and a digit, while `createUserSchema` additionally wanted
 * a symbol — so a password could pass the form and be refused by the API. A
 * meter that scores by a third standard would have made that worse, not better.
 *
 * An empty password scores `Weak` with a zero bar rather than an empty state,
 * because the field is required and "nothing typed yet" and "too weak" are the
 * same answer to "can this be submitted".
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const requirements = evaluateRequirements(password);
  const meetsPolicy =
    requirements.hasMinLength &&
    requirements.withinMaxLength &&
    requirements.hasUppercase &&
    requirements.hasLowercase &&
    requirements.hasDigit &&
    requirements.hasSymbol;

  const level = resolveLevel(meetsPolicy, password.length);

  return {
    level,
    score: password.length === 0 ? 0 : SCORE_BY_LEVEL[level],
    meetsPolicy,
    requirements,
  };
}
