import { createHash } from 'node:crypto';

import { Locale } from '@claw/shared-types';

import {
  ACCEPTED_GAP_PROMPT_STRIP_CHARS,
  ACCEPTED_GAPS_BLOCK_HASH_CHARS,
  ACCEPTED_GAPS_BLOCK_PREFIX,
  ACCEPTED_GAPS_BLOCK_TITLE,
  AUTHOR_GAPS_NOTE,
  AUTHOR_GAPS_RULES,
  INVISIBLE_FORMAT_CHAR_PATTERN,
  LIMITATIONS_HEADINGS,
  REVIEW_GAPS_NOTE,
  REVIEW_GAPS_RUBRIC,
} from '../constants/accepted-gaps.constants';
import { LAST_CONTROL_CODE, WHITESPACE_RUN_PATTERN } from '../constants/evidence-gap.constants';

/**
 * A gap as data for a prompt: invisible, control and markup or role-delimiter characters removed,
 * whitespace collapsed. Applied on top of the JSON quoting, never instead of it.
 */
export function sanitizeGapForPrompt(text: string): string {
  const kept = [...text.normalize('NFKC')].filter((char) => {
    const code = char.codePointAt(0) ?? 0;
    return (
      code > LAST_CONTROL_CODE &&
      !ACCEPTED_GAP_PROMPT_STRIP_CHARS.includes(char) &&
      !INVISIBLE_FORMAT_CHAR_PATTERN.test(char)
    );
  });
  return kept.join('').replaceAll(WHITESPACE_RUN_PATTERN, ' ').trim();
}

/**
 * The accepted gaps as a clearly delimited block of untrusted quoted data for the USER part of a
 * prompt. The delimiter carries a hash of the content, so no gap text can name its own closing
 * marker. Empty when nothing was accepted.
 */
export function acceptedGapsDataBlock(accepted: readonly string[]): string {
  if (accepted.length === 0) return '';
  const quoted = JSON.stringify(accepted.map(sanitizeGapForPrompt));
  const marker = `${ACCEPTED_GAPS_BLOCK_PREFIX}${createHash('sha256')
    .update(quoted)
    .digest('hex')
    .slice(0, ACCEPTED_GAPS_BLOCK_HASH_CHARS)}`;
  return [ACCEPTED_GAPS_BLOCK_TITLE, `BEGIN_${marker}`, quoted, `END_${marker}`].join('\n');
}

/**
 * The authors' fixed rule for owner-accepted gaps: a limitations section, one plain item per
 * quoted gap, the exact heading for the article language (the post-check looks for it), nothing
 * invented. The gap texts are in the user message, never here.
 */
export function authorGapsNote(locale: Locale, language: string): string {
  const heading = LIMITATIONS_HEADINGS.get(locale) ?? LIMITATIONS_HEADINGS.get(Locale.EN) ?? '';
  return [
    AUTHOR_GAPS_NOTE,
    `Add an H2 section headed exactly "${heading}" before the final "Sources" list, with one bullet for each accepted item stating plainly in ${language} what could not be found or verified.`,
    AUTHOR_GAPS_RULES,
  ].join(' ');
}

/** The Judge's and the Critic's fixed rubric note for owner-accepted gaps. */
export function reviewGapsNote(): string {
  return `${REVIEW_GAPS_NOTE} ${REVIEW_GAPS_RUBRIC}`;
}
