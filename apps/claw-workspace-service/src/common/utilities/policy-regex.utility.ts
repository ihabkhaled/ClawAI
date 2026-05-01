import {
  MAX_POLICY_PATTERN_LENGTH,
  SUSPICIOUS_QUANTIFIER_REGEX,
} from '../constants/policy-regex.constants';

// Compiles an admin-supplied policy pattern into a RegExp.
// Two safety gates: max length 256 and rejection of nested-quantifier shapes
// known to enable catastrophic backtracking. Mirrors the agent-service pattern.
// Throws on validation failure so the controller can surface 400 BAD_REQUEST.
export function compilePolicyPattern(pattern: string): RegExp {
  if (pattern.length > MAX_POLICY_PATTERN_LENGTH) {
    throw new Error(
      `Policy pattern exceeds maximum length of ${String(MAX_POLICY_PATTERN_LENGTH)} characters`,
    );
  }
  if (SUSPICIOUS_QUANTIFIER_REGEX.test(pattern)) {
    throw new Error('Policy pattern contains suspicious nested quantifiers (potential ReDoS)');
  }
  // eslint-disable-next-line security/detect-non-literal-regexp -- admin-provided pattern, length-capped + ReDoS-checked above
  return new RegExp(pattern);
}

export function isPolicyPatternSafe(pattern: string): boolean {
  try {
    compilePolicyPattern(pattern);
    return true;
  } catch {
    return false;
  }
}
