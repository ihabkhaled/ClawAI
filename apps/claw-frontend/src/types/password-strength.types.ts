import type { PasswordStrengthLevel } from '@/enums/password-strength-level.enum';

/**
 * Which policy requirements a candidate password currently meets.
 *
 * Kept as individual booleans rather than a count so the meter can name the one
 * thing still missing instead of saying "not strong enough" and leaving the
 * administrator to guess which rule they tripped.
 */
export interface PasswordRequirementState {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasDigit: boolean;
  hasSymbol: boolean;
  withinMaxLength: boolean;
}

export interface PasswordStrengthResult {
  level: PasswordStrengthLevel;
  /** 0-4, for the meter's filled-segment count. */
  score: number;
  /** True only when every requirement is met — mirrors the backend policy. */
  meetsPolicy: boolean;
  requirements: PasswordRequirementState;
}

/** Label, colour and unmet-requirement copy for the strength meter. */
export interface PasswordStrengthPresentation {
  labelKey: string;
  barClassName: string;
  labelClassName: string;
  unmetRequirementKeys: string[];
}
