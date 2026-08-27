import { type PasswordPolicyResult } from '../types/users.types';

/**
 * The platform-wide password floor: length, upper, lower, digit.
 *
 * Deliberately one rule looser than `createUserSchema`, which additionally
 * demands a symbol. That divergence is intentional, not drift: this function
 * also guards self-registration (`AuthManager.register`) and
 * `UsersService.changePassword`, so tightening it here would retroactively
 * reject passwords that existing accounts are entitled to keep using. The
 * stricter rule belongs on the administrator-create path, where the password is
 * generated or chosen by somebody other than its owner and is replaced on first
 * sign-in anyway.
 *
 * The frontend mirrors the strict rule for that one form
 * (`lib/validation/admin-create-user.schema.ts`) rather than reusing the signup
 * schema, so the dialog cannot accept a password the API will refuse.
 */
export function validatePasswordStrength(password: string): PasswordPolicyResult {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (password.length > 128) errors.push('Password must be at most 128 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter');
  if (!/\d/.test(password)) errors.push('Password must contain a number');
  return { valid: errors.length === 0, errors };
}
