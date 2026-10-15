import type { Locale } from '@claw/shared-types';

import {
  ENGLISH_HEADING_WORDS,
  FORMAT_WORD_DRIFT_PERCENT,
} from '../constants/format-prompt.constants';
import {
  MARKUP_CHARACTERS_PATTERN,
  NUMBER_PATTERN,
  PERCENT,
  RAW_HTML_PATTERN,
  TRAILING_NUMBER_PUNCTUATION,
  UNKNOWN_MARKER_PATTERN,
} from '../constants/format-scan.constants';
import { FormatViolation } from '../constants/format-violation.constants';
import type {
  FormatGuardInput,
  FormatViolation as FormatViolationCode,
} from '../types/format-guard.types';
import {
  countTables,
  extractUrls,
  foldDigits,
  headingsOf,
  proseLines,
  stripLineMarkers,
} from './format-markdown-scan.utility';

/** How many times `[id]` appears as a citation marker (not as a link label `[id](url)`). */
function markerCount(text: string, id: string): number {
  const marker = `[${id.toLowerCase()}]`;
  const haystack = text.toLowerCase();
  let count = 0;
  let from = haystack.indexOf(marker);
  while (from !== -1) {
    const after = from + marker.length;
    if (haystack.charAt(after) !== '(') {
      count += 1;
    }
    from = haystack.indexOf(marker, after);
  }
  return count;
}

function withoutMarkersAndUrls(markdown: string, evidenceIds: readonly string[]): string {
  let text = proseLines(markdown).map(stripLineMarkers).join('\n');
  for (const id of evidenceIds) {
    text = text.replaceAll(`[${id}]`, ' ');
  }
  text = text.replaceAll(UNKNOWN_MARKER_PATTERN, ' ');
  for (const url of extractUrls(text)) {
    text = text.replaceAll(url, ' ');
  }
  return text;
}

function countNumbers(markdown: string, evidenceIds: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  const text = foldDigits(withoutMarkersAndUrls(markdown, evidenceIds));
  for (const raw of text.match(NUMBER_PATTERN) ?? []) {
    const token = raw.replace(TRAILING_NUMBER_PUNCTUATION, '');
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

/** Words for spaced scripts, segmenter words for ja/zh/th; markup, markers and urls are not words. */
export function countArticleWords(
  markdown: string,
  locale: Locale,
  evidenceIds: readonly string[],
): number {
  const text = withoutMarkersAndUrls(markdown, evidenceIds).replaceAll(
    MARKUP_CHARACTERS_PATTERN,
    ' ',
  );
  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
  let words = 0;
  for (const part of segmenter.segment(text)) {
    if (part.isWordLike) {
      words += 1;
    }
  }
  return words;
}

function numbersViolation(input: FormatGuardInput): FormatViolationCode | null {
  const before = countNumbers(input.before, input.evidenceIds);
  const after = countNumbers(input.after, input.evidenceIds);
  for (const [token, count] of before) {
    if ((after.get(token) ?? 0) < count) {
      return FormatViolation.NUMBER_CHANGED;
    }
  }
  for (const token of after.keys()) {
    if (!before.has(token)) {
      return FormatViolation.NUMBER_CHANGED;
    }
  }
  return null;
}

function citationViolation(input: FormatGuardInput): FormatViolationCode | null {
  for (const id of input.evidenceIds) {
    if (markerCount(input.after, id) < markerCount(input.before, id)) {
      return FormatViolation.CITATION_LOST;
    }
  }
  const known = new Set(input.evidenceIds.map((id) => id.toLowerCase()));
  for (const match of input.after.matchAll(UNKNOWN_MARKER_PATTERN)) {
    if (!known.has((match[1] ?? '').toLowerCase())) {
      return FormatViolation.CITATION_ADDED;
    }
  }
  return null;
}

function urlViolation(input: FormatGuardInput): FormatViolationCode | null {
  const allowed = new Set([...extractUrls(input.before), ...input.citationUrls]);
  return extractUrls(input.after).every((url) => allowed.has(url))
    ? null
    : FormatViolation.URL_ADDED;
}

function structureViolation(input: FormatGuardInput): FormatViolationCode | null {
  const headings = headingsOf(input.after);
  if (headings.filter(({ level }) => level === 1).length !== 1) {
    return FormatViolation.STRUCTURE;
  }
  if (countTables(input.after) < countTables(input.before)) {
    return FormatViolation.TABLE_LOST;
  }
  if (input.locale !== 'en') {
    const leaked = headings.some(({ text }) =>
      ENGLISH_HEADING_WORDS.includes(
        text
          .trim()
          .replace(/[:：]$/u, '')
          .toLowerCase(),
      ),
    );
    if (leaked) {
      return FormatViolation.HEADING_LANGUAGE;
    }
  }
  return null;
}

function lengthViolation(input: FormatGuardInput): FormatViolationCode | null {
  const before = countArticleWords(input.before, input.locale, input.evidenceIds);
  const after = countArticleWords(input.after, input.locale, input.evidenceIds);
  if (before === 0) {
    return null;
  }
  const drift = (Math.abs(after - before) * PERCENT) / before;
  return drift > FORMAT_WORD_DRIFT_PERCENT ? FormatViolation.LENGTH_DRIFT : null;
}

/**
 * Proves a formatted article kept what the Critic reviewed: every citation marker, every number
 * and date, every table, no new url or html, one title, translated headings, and the word count
 * within the drift limit. Null means the formatted text may replace the original.
 */
export function validateFormatted(input: FormatGuardInput): FormatViolationCode | null {
  if (input.after.trim().length === 0) {
    return FormatViolation.EMPTY;
  }
  return RAW_HTML_PATTERN.test(input.after) && !RAW_HTML_PATTERN.test(input.before)
    ? FormatViolation.RAW_HTML
    : (citationViolation(input) ??
        numbersViolation(input) ??
        urlViolation(input) ??
        structureViolation(input) ??
        lengthViolation(input));
}
