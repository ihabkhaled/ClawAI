import { SENSITIVITY_PRE_FILTER_PATTERNS } from '../constants/memory-sensitivity.constants';
import type { MaskSecretsResult } from '../types/sensitivity-pattern.types';

/** Length-preserving mask: keeps 2 leading and 4 trailing characters. */
function mask(match: string): string {
  return match.length <= 6
    ? '*'.repeat(match.length)
    : `${match.slice(0, 2)}${'*'.repeat(match.length - 6)}${match.slice(-4)}`;
}

/**
 * Masks every secret-shaped span in `content` and returns the rest untouched.
 * The output is always the same length as the input — never a preview, never
 * a truncation. Used on write (so a stored REDACTED memory is already safe)
 * and again on read (so rows written before this rule are safe too).
 */
export function maskSecrets(content: string): MaskSecretsResult {
  const matched: string[] = [];
  let masked = content;
  for (const { name, pattern, accept } of SENSITIVITY_PRE_FILTER_PATTERNS) {
    let hit = false;
    masked = masked.replaceAll(pattern, (match) => {
      if (accept !== undefined && !accept(match)) return match;
      hit = true;
      return mask(match);
    });
    if (hit) matched.push(name);
  }
  return { masked, matched };
}
