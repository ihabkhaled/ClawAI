import {
  MAX_POLICY_PATTERN_LENGTH,
  SUSPICIOUS_QUANTIFIER_REGEX,
} from '../constants/policy-regex.constants';

/**
 * Compiles a user-provided policy pattern into a RegExp.
 *
 * Admin-supplied policy patterns are intentionally dynamic (the policy
 * engine matches commands against custom regexes). To minimise the
 * security surface (ReDoS / catastrophic backtracking) we:
 *  - cap the source length (no pattern longer than 256 chars is allowed)
 *  - reject suspicious nested-quantifier patterns at parse time
 *
 * If validation fails, throws — callers should surface a 400 BAD_REQUEST
 * back to the admin who tried to save the policy.
 */
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
