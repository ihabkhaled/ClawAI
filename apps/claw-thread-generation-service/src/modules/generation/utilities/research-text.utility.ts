import {
  HIRAGANA_ONLY_PATTERN,
  LABEL_PATTERN,
  RESEARCH_GENERIC_WORDS,
  RESEARCH_KEYWORD_MIN_CHARS,
  RESEARCH_KEYWORD_MIN_CHARS_ARABIC,
  RESEARCH_KEYWORD_MIN_CHARS_UNSPACED,
  RESEARCH_QUERY_MAX_CHARS,
  SENTENCE_END_PATTERN,
  WORD_TRIM_CHARS,
} from '../constants/research-queries.constants';
import {
  ARABIC_SCRIPT_PATTERN,
  UNSPACED_SCRIPT_PATTERN,
} from '../constants/accepted-gaps.constants';
import { EVIDENCE_GAP_TERMS, WHITESPACE_RUN_PATTERN } from '../constants/evidence-gap.constants';
import { foldForMatch } from './classify-blocker.utility';
import { tidyQueryText } from './evidence-gap-query.utility';

const WORD_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'word' });

/**
 * A query-sized piece of text: secrets, URL query strings and control characters removed,
 * whitespace collapsed, and cut at a word boundary when it passes the bound.
 */
export function clampQuery(text: string, max: number = RESEARCH_QUERY_MAX_CHARS): string {
  const tidy = tidyQueryText(text, Number.MAX_SAFE_INTEGER)
    .replaceAll(WHITESPACE_RUN_PATTERN, ' ')
    .trim();
  const points = [...tidy];
  if (points.length <= max) return tidy;
  const cut = points.slice(0, max).join('');
  const lastSpace = cut.lastIndexOf(' ');
  const wordBoundary = lastSpace >= Math.floor(max * 0.6) ? cut.slice(0, lastSpace) : cut;
  return wordBoundary.trim();
}

/** The first sentence of a topic, without a leading label such as "Research question:". */
export function topicSubject(topic: string): string {
  const flat = topic.trim();
  const end = SENTENCE_END_PATTERN.exec(flat);
  const sentence = end ? flat.slice(0, end.index + 1) : flat;
  const unlabeled = sentence.replace(LABEL_PATTERN, '');
  return unlabeled.length >= 12 ? unlabeled : sentence;
}

function minChars(word: string): number {
  if (UNSPACED_SCRIPT_PATTERN.test(word)) return RESEARCH_KEYWORD_MIN_CHARS_UNSPACED;
  return ARABIC_SCRIPT_PATTERN.test(word)
    ? RESEARCH_KEYWORD_MIN_CHARS_ARABIC
    : RESEARCH_KEYWORD_MIN_CHARS;
}

function trimWord(word: string): string {
  let start = 0;
  let end = word.length;
  while (start < end && WORD_TRIM_CHARS.includes(word.charAt(start))) start += 1;
  while (end > start && WORD_TRIM_CHARS.includes(word.charAt(end - 1))) end -= 1;
  return word.slice(start, end);
}

function isSourcingWord(folded: string): boolean {
  return EVIDENCE_GAP_TERMS.some((term) => {
    const stem = foldForMatch(term).trim();
    return stem.length >= 3 && folded.startsWith(stem);
  });
}

/** Words of a text that name its subject, as written, in first-seen order of the most frequent. */
export function significantWords(text: string, max: number, skipSourcing = false): string[] {
  const counts = new Map<string, { word: string; count: number; at: number }>();
  let at = 0;
  for (const part of WORD_SEGMENTER.segment(text)) {
    if (!part.isWordLike) continue;
    const word = trimWord(part.segment);
    const folded = foldForMatch(word);
    at += 1;
    const skip =
      [...word].length < minChars(word) ||
      RESEARCH_GENERIC_WORDS.has(folded) ||
      (skipSourcing && isSourcingWord(folded)) ||
      /^\d+$/u.test(word) ||
      HIRAGANA_ONLY_PATTERN.test(word);
    if (skip) continue;
    const seen = counts.get(folded);
    if (seen) seen.count += 1;
    else counts.set(folded, { word, count: 1, at });
  }
  return [...counts.values()]
    .sort((left, right) => right.count - left.count || left.at - right.at)
    .slice(0, max)
    .sort((left, right) => left.at - right.at)
    .map(({ word }) => word);
}
