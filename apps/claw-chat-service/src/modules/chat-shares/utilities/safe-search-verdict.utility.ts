import {
  DISQUALIFYING_LIKELIHOODS,
  MODERATED_SAFE_SEARCH_CATEGORIES,
} from '../constants/image-safety.constants';
import type { SafeSearchAnnotation } from '../types/image-safety.types';

/**
 * Turns a SafeSearch annotation into an approve/reject decision.
 *
 * Pure, so the policy can be tested without a network call — the decision is
 * the part worth pinning down, not the HTTP.
 *
 * Fails closed in both directions. A missing annotation is not an approval: an
 * image nobody managed to classify is exactly the image not to put an ad next
 * to. An unrecognised likelihood string is treated the same way, so a future
 * Cloud Vision level this code has never heard of cannot quietly pass.
 */
export function isSafeForAdvertising(annotation: SafeSearchAnnotation | null): boolean {
  if (annotation === null) {
    return false;
  }

  return MODERATED_SAFE_SEARCH_CATEGORIES.every((category) => {
    const likelihood = annotation[category];
    if (typeof likelihood !== 'string') {
      // The category was not reported at all. Unknown is not safe.
      return false;
    }
    if (DISQUALIFYING_LIKELIHOODS.includes(likelihood)) {
      return false;
    }
    // Only the two explicitly-negative levels are an approval.
    return likelihood === 'VERY_UNLIKELY' || likelihood === 'UNLIKELY';
  });
}

/**
 * The categories that caused a rejection, for the audit trail.
 *
 * Category names only — never the image, never a thumbnail, never a URL. The
 * reason column is read by operators and must not become a pointer back to the
 * content it is describing.
 */
export function describeRejection(annotation: SafeSearchAnnotation | null): string {
  if (annotation === null) {
    return 'no annotation returned';
  }
  const flagged = MODERATED_SAFE_SEARCH_CATEGORIES.filter((category) => {
    const likelihood = annotation[category];
    return typeof likelihood === 'string' && DISQUALIFYING_LIKELIHOODS.includes(likelihood);
  });
  return flagged.length > 0 ? flagged.join(',') : 'unrecognised likelihood';
}
