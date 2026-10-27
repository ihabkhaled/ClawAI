import { BadRequestException } from '@nestjs/common';
import type { ThreadReviewVerdict } from '@claw/shared-types';

import {
  ACCEPTED_GAP_NOT_A_BLOCKER_CODE,
  ACCEPTED_GAP_NOT_A_BLOCKER_MESSAGE,
} from '../constants/accepted-gaps.constants';
import { WHITESPACE_RUN_PATTERN } from '../constants/evidence-gap.constants';
import { normalizeAcceptedGaps, stripControlCharacters } from './accepted-gaps.utility';

/** The coded 400 of a retry that tries to accept something the failed review never blocked on. */
export function acceptedGapRejected(): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code: ACCEPTED_GAP_NOT_A_BLOCKER_CODE,
    message: ACCEPTED_GAP_NOT_A_BLOCKER_MESSAGE,
  });
}

/** A gap as compared: NFKC, control characters removed, whitespace collapsed, trimmed. */
export function canonicalGap(text: string): string {
  return stripControlCharacters(
    text.normalize('NFKC').replaceAll(WHITESPACE_RUN_PATTERN, ' '),
  ).trim();
}

/** True when the owner asked to accept anything at all. */
export function requestsAcceptedGaps(
  texts: readonly string[] | undefined,
  indexes: readonly number[] | undefined,
): boolean {
  return (texts?.length ?? 0) > 0 || (indexes?.length ?? 0) > 0;
}

/**
 * The gaps a retry may accept, taken from the failed job's STORED review verdict (ADR-193), never
 * from the request: each requested text must equal (after NFKC, whitespace and control-character
 * normalisation) one of the verdict's evidence-gap blockers, and each index must point at one.
 * Anything else rejects the whole request with ACCEPTED_GAP_NOT_A_BLOCKER; nothing is dropped
 * silently. The result is the stored blocker text, so the pipeline compares what it stored.
 */
export function verifyAcceptedGaps(
  verdict: ThreadReviewVerdict | null,
  texts: readonly string[] | undefined,
  indexes: readonly number[] | undefined,
): string[] {
  if (!requestsAcceptedGaps(texts, indexes)) return [];
  const blockers = verdict?.evidenceGapBlockers ?? [];
  const byText = new Map(blockers.map((blocker) => [canonicalGap(blocker), blocker]));
  const accepted = new Set<string>();
  for (const text of texts ?? []) {
    const stored = byText.get(canonicalGap(text));
    if (stored === undefined) throw acceptedGapRejected();
    accepted.add(stored);
  }
  for (const index of indexes ?? []) {
    const stored = blockers.at(index);
    if (stored === undefined || index < 0) throw acceptedGapRejected();
    accepted.add(stored);
  }
  return normalizeAcceptedGaps([...accepted]);
}
