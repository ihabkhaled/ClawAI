import {
  DELETE_CODE,
  EVIDENCE_GAP_QUERY_BLOCKER_CHARS,
  EVIDENCE_GAP_QUERY_LEAD,
  EVIDENCE_GAP_QUERY_MAX_BLOCKERS,
  EVIDENCE_GAP_QUERY_MAX_CHARS,
  EVIDENCE_GAP_QUERY_TOPIC_CHARS,
  LAST_CONTROL_CODE,
  WHITESPACE_RUN_PATTERN,
} from '../constants/evidence-gap.constants';
import { clampReviewText } from './clamp-review-text.utility';
import { redactSensitiveText } from './redact-excerpt.utility';

function withoutControlChars(text: string): string {
  return [...text]
    .map((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code <= LAST_CONTROL_CODE || code === DELETE_CODE ? ' ' : char;
    })
    .join('');
}

export function tidyQueryText(text: string, max: number): string {
  const cleaned = withoutControlChars(redactSensitiveText(text));
  return clampReviewText(cleaned.replaceAll(WHITESPACE_RUN_PATTERN, ' '), max);
}

/**
 * The intent of the one targeted research pass: the topic and the evidence-gap blockers, each
 * shortened, with secrets and URL query strings removed, and the whole capped. The blockers say
 * what is missing; the topic says what the article is about.
 */
export function buildEvidenceGapQuery(topic: string, blockers: readonly string[]): string {
  const parts = blockers
    .slice(0, EVIDENCE_GAP_QUERY_MAX_BLOCKERS)
    .map((blocker) => tidyQueryText(blocker, EVIDENCE_GAP_QUERY_BLOCKER_CHARS))
    .filter((blocker) => blocker.length > 0);
  const query = [
    `${EVIDENCE_GAP_QUERY_LEAD}${tidyQueryText(topic, EVIDENCE_GAP_QUERY_TOPIC_CHARS)}`,
    ...parts,
  ].join('\n');
  return clampReviewText(query, EVIDENCE_GAP_QUERY_MAX_CHARS);
}
