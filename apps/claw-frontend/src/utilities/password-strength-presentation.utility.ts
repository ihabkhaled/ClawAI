import { PasswordStrengthLevel } from '@/enums/password-strength-level.enum';
import type { PasswordStrengthPresentation, PasswordStrengthResult } from '@/types';

const PRESENTATION_BY_LEVEL: Record<
  PasswordStrengthLevel,
  { labelKey: string; barClassName: string; labelClassName: string }
> = {
  [PasswordStrengthLevel.Weak]: {
    labelKey: 'admin.createUserPasswordWeak',
    barClassName: 'bg-destructive',
    labelClassName: 'text-destructive',
  },
  [PasswordStrengthLevel.Fair]: {
    labelKey: 'admin.createUserPasswordFair',
    barClassName: 'bg-warning',
    labelClassName: 'text-warning',
  },
  [PasswordStrengthLevel.Good]: {
    labelKey: 'admin.createUserPasswordGood',
    barClassName: 'bg-primary',
    labelClassName: 'text-primary',
  },
  [PasswordStrengthLevel.Strong]: {
    labelKey: 'admin.createUserPasswordStrong',
    barClassName: 'bg-success',
    labelClassName: 'text-success',
  },
};

const REQUIREMENT_KEYS: ReadonlyArray<{
  key: keyof PasswordStrengthResult['requirements'];
  messageKey: string;
}> = [
  { key: 'hasMinLength', messageKey: 'admin.createUserPasswordNeedsLength' },
  { key: 'hasUppercase', messageKey: 'admin.createUserPasswordNeedsUppercase' },
  { key: 'hasLowercase', messageKey: 'admin.createUserPasswordNeedsLowercase' },
  { key: 'hasDigit', messageKey: 'admin.createUserPasswordNeedsDigit' },
  { key: 'hasSymbol', messageKey: 'admin.createUserPasswordNeedsSymbol' },
  { key: 'withinMaxLength', messageKey: 'admin.createUserPasswordTooLong' },
];

/**
 * Maps a strength result to the label, colour and unmet-requirement list the
 * meter renders.
 *
 * Separated from the component because a `.tsx` file may hold render
 * composition only, and separated from `evaluatePasswordStrength` because
 * scoring is a policy question while colour and copy are a presentation one —
 * the backend cares about the first and not the second.
 */
export function resolvePasswordStrengthPresentation(
  strength: PasswordStrengthResult,
): PasswordStrengthPresentation {
  const presentation = PRESENTATION_BY_LEVEL[strength.level];

  return {
    ...presentation,
    unmetRequirementKeys: REQUIREMENT_KEYS.filter(
      (requirement) => !strength.requirements[requirement.key],
    ).map((requirement) => requirement.messageKey),
  };
}
