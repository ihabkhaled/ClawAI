import type { ThreadGenerationProgress } from '@claw/shared-types';

import {
  THREAD_ACCEPTED_GAP_MAX_CHARS,
  THREAD_ACCEPTED_GAPS_MAX,
  THREAD_GAP_LIST_SEPARATOR,
} from '@/constants/thread-evidence.constants';

/**
 * The gap texts a retry sends: blanks and repeats dropped, each shortened to what the services
 * accept, at most eight. The texts are the reviewer's own words, never rewritten.
 */
export function normalizeAcceptedGaps(texts: readonly string[] | undefined): string[] {
  const unique = new Set<string>();
  for (const text of texts ?? []) {
    const trimmed = [...text.trim()].slice(0, THREAD_ACCEPTED_GAP_MAX_CHARS).join('').trim();
    if (trimmed !== '') {
      unique.add(trimmed);
    }
  }
  return [...unique].slice(0, THREAD_ACCEPTED_GAPS_MAX);
}

/**
 * The blockers of the failed review that ask for evidence the research could not supply: the only
 * ones an owner may accept. Empty for an older service, or a failure that is not a review.
 */
export function threadGapChoices(progress: ThreadGenerationProgress | undefined): string[] {
  return normalizeAcceptedGaps(progress?.failure?.review?.evidenceGapBlockers);
}

/** The gap texts of an ACCEPTED_GAPS or ACCEPTED_GAP_WAIVED step excerpt, one per line. */
export function splitThreadGapExcerpt(excerpt: string | null): string[] {
  return excerpt === null
    ? []
    : excerpt
        .split(THREAD_GAP_LIST_SEPARATOR)
        .map((line) => line.trim())
        .filter((line) => line !== '');
}
