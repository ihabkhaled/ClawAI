import type { SensitivityPattern } from '../types/sensitivity-pattern.types';
import { isLuhnValid, looksLikeSecretToken } from '../utilities/sensitivity-validators.utility';

/**
 * Static patterns used by MemorySensitivityManager.
 * Loosely modeled on common DLP detection rule sets.
 *
 * Every pattern is matched over the WHOLE content and only the matched span is
 * masked. Two patterns carry an `accept` check because on their own they fire
 * on ordinary prose: a 40-character run of `[A-Za-z0-9/+]` is any long URL
 * path, and 13–19 digits is any order number. Before the checks, one such false
 * positive in a 45K-char spec replaced the whole memory with a 256-char stub.
 */
export const SENSITIVITY_PRE_FILTER_PATTERNS: readonly SensitivityPattern[] = [
  { name: 'aws_access_key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  {
    name: 'aws_secret_key',
    pattern: /(?<![0-9a-zA-Z/+])[0-9a-zA-Z/+]{40}(?![0-9a-zA-Z/+])/g,
    accept: looksLikeSecretToken,
  },
  {
    name: 'private_key_block',
    pattern: /-----BEGIN (?:RSA|EC|OPENSSH|DSA|PGP)?\s?PRIVATE KEY-----/g,
  },
  { name: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { name: 'ssn_us', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { name: 'credit_card', pattern: /\b(?:\d[ -]?){13,19}\b/g, accept: isLuhnValid },
  { name: 'google_api_key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: 'github_token', pattern: /\bgh[pousr]_[0-9A-Za-z]{30,}\b/g },
  // Bound the upper repetition to avoid ReDoS (security/detect-unsafe-regex).
  { name: 'openai_key', pattern: /\bsk-[0-9A-Za-z]{20,256}\b/g },
];

/**
 * Soft hints — markers that probably indicate sensitive content but are not
 * themselves a leak. Used to upgrade verdict to SENSITIVE (not REDACTED).
 */
export const SENSITIVITY_SOFT_HINTS: readonly string[] = [
  'password',
  'passphrase',
  'secret',
  'credit card',
  'ssn',
  'social security',
  'medical',
  'diagnosis',
  'prescription',
  'salary',
  'compensation',
];
