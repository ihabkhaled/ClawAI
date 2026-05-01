import { SECRET_PATTERNS } from '../constants/ticket-planning.constants';

export type SecretScanResult = {
  hasSecret: boolean;
  matchedPatternIndex: number | null;
};

/**
 * Stream 41 — defence-in-depth scan over an IMPL_PROMPT body before handoff.
 * Returns hasSecret=true if any high-confidence pattern matches.
 */
export function scanForSecrets(text: string): SecretScanResult {
  for (const [index, pattern] of SECRET_PATTERNS.entries()) {
    if (pattern.test(text)) {
      return { hasSecret: true, matchedPatternIndex: index };
    }
  }
  return { hasSecret: false, matchedPatternIndex: null };
}
