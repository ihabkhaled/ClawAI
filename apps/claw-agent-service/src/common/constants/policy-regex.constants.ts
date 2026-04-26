/**
 * Constants for policy regex compilation safety.
 * See `src/common/utilities/policy-regex.utility.ts` for usage.
 */
export const MAX_POLICY_PATTERN_LENGTH = 256;

export const SUSPICIOUS_QUANTIFIER_REGEX = /(\(.*\+\).*\+|\(.*\*\).*\*|\(.*\+\).*\{)/;
