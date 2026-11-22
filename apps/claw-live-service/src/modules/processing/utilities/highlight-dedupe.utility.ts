import { tokenSetJaccard } from '../../../common/utilities/text-similarity.utility';
import type { LiveHighlightType } from '../../../generated/prisma';
import {
  HIGHLIGHT_DEDUPE_SIMILARITY,
  HIGHLIGHT_DEDUPE_WINDOW_MS,
} from '../constants/processing.constants';
import type { RememberedHighlight } from '../types/processing.types';

/**
 * A highlight is a near-duplicate when one of the same type with ≥ 0.8 token-set
 * similarity was kept within 120 s of it (section 4).
 */
export function isDuplicateHighlight(
  type: LiveHighlightType,
  text: string,
  at: number,
  recent: readonly RememberedHighlight[],
): boolean {
  return recent.some(
    (kept) =>
      kept.type === type &&
      Math.abs(kept.at - at) <= HIGHLIGHT_DEDUPE_WINDOW_MS &&
      tokenSetJaccard(kept.text, text) >= HIGHLIGHT_DEDUPE_SIMILARITY,
  );
}
