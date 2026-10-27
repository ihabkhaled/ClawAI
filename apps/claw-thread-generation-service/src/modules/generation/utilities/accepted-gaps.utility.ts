import { Locale } from '@claw/shared-types';

import {
  ACCEPTED_GAP_MAX_CHARS,
  ACCEPTED_GAPS_MAX,
  ARABIC_ARTICLE_PREFIX,
  ARABIC_SCRIPT_PATTERN,
  GAP_ARABIC_WORD_MIN_CHARS,
  GAP_FILLER_WORDS,
  GAP_MATCH_MIN_SHARE,
  GAP_MATCH_MIN_SHARE_UNSPACED,
  GAP_WORD_MIN_CHARS,
  GAP_WORD_STEM_CHARS,
  HEADING_PATTERN,
  LIMITATIONS_HEADING_KEYWORDS,
  LIST_MARKER_PATTERN,
  UNSPACED_SCRIPT_PATTERN,
  WORD_PATTERN,
} from '../constants/accepted-gaps.constants';
import {
  DELETE_CODE,
  EVIDENCE_GAP_TERMS,
  LAST_CONTROL_CODE,
  WHITESPACE_RUN_PATTERN,
} from '../constants/evidence-gap.constants';
import type { AcceptedGapSplit, MarkdownSection } from '../types/accepted-gaps.types';
import { foldForMatch, isEvidenceGapBlocker } from './classify-blocker.utility';

function stripControlCharacters(text: string): string {
  return [...text]
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code > LAST_CONTROL_CODE && code !== DELETE_CODE;
    })
    .join('');
}

/**
 * The accepted gaps as stored and compared: control characters removed, whitespace collapsed,
 * blanks and repeats dropped, shortened to the bound and sorted, so the same choice made in any
 * order is the same request (idempotency) and no text can carry a hidden line into a prompt.
 */
export function normalizeAcceptedGaps(items: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  for (const item of items ?? []) {
    const cleaned = stripControlCharacters(item.replaceAll(WHITESPACE_RUN_PATTERN, ' ')).trim();
    const shortened = [...cleaned].slice(0, ACCEPTED_GAP_MAX_CHARS).join('').trim();
    if (shortened.length > 0) seen.add(shortened);
  }
  return [...seen].sort().slice(0, ACCEPTED_GAPS_MAX);
}

function addPairs(word: string, into: Set<string>): void {
  const chars = [...word];
  if (chars.length === 1) into.add(word);
  for (let at = 0; at + 1 < chars.length; at += 1) into.add(chars.slice(at, at + 2).join(''));
}

/** Comparable words of a text: stems of alphabetic words, pairs of characters for unspaced scripts. */
function tokensOf(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const word of foldForMatch(text).match(WORD_PATTERN) ?? []) {
    if (UNSPACED_SCRIPT_PATTERN.test(word)) {
      addPairs(word, tokens);
      continue;
    }
    const arabic = ARABIC_SCRIPT_PATTERN.test(word);
    const bare =
      arabic && word.startsWith(ARABIC_ARTICLE_PREFIX)
        ? word.slice(ARABIC_ARTICLE_PREFIX.length)
        : word;
    const chars = [...bare];
    if (chars.length >= (arabic ? GAP_ARABIC_WORD_MIN_CHARS : GAP_WORD_MIN_CHARS)) {
      tokens.add(chars.slice(0, GAP_WORD_STEM_CHARS).join(''));
    }
  }
  return tokens;
}

/** The words every sourcing blocker shares ("cite", "sources", "primary"); they prove no topic. */
const GENERIC_TOKENS: ReadonlySet<string> = new Set([
  ...EVIDENCE_GAP_TERMS.flatMap((term) => [...tokensOf(term)]),
  ...GAP_FILLER_WORDS.flatMap((word) => [...tokensOf(word)]),
]);

/** The topic words of a blocker: what it asks a source for, without the sourcing vocabulary. */
function specificTokens(text: string): Set<string> {
  return new Set([...tokensOf(text)].filter((token) => !GENERIC_TOKENS.has(token)));
}

function countShared(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared;
}

function minShare(...texts: string[]): number {
  return texts.some((text) => UNSPACED_SCRIPT_PATTERN.test(text))
    ? GAP_MATCH_MIN_SHARE_UNSPACED
    : GAP_MATCH_MIN_SHARE;
}

function similarTopics(
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
  share: number,
): boolean {
  if (left.size === 0 || right.size === 0) return left.size === right.size;
  const shared = countShared(left, right);
  const smaller = Math.min(left.size, right.size);
  const enoughWords = smaller < 3 || shared >= 2;
  return shared >= 1 && enoughWords && shared / smaller >= share;
}

/**
 * True when a blocker is an evidence-gap blocker (ADR-193 classifier) about the same topic as one
 * of the gaps the owner accepted. A blocker the classifier does not recognise, or about another
 * topic, never matches, so it keeps blocking.
 */
export function matchesAcceptedGap(blocker: string, accepted: readonly string[]): boolean {
  if (accepted.length === 0 || !isEvidenceGapBlocker(blocker)) return false;
  const topic = specificTokens(blocker);
  return accepted.some((gap) => similarTopics(topic, specificTokens(gap), minShare(blocker, gap)));
}

/** The blockers the owner accepted, and those that still block. */
export function splitAcceptedBlockers(
  blockers: readonly string[],
  accepted: readonly string[],
): AcceptedGapSplit {
  const waived: string[] = [];
  const remaining: string[] = [];
  for (const blocker of blockers) {
    (matchesAcceptedGap(blocker, accepted) ? waived : remaining).push(blocker);
  }
  return { waived, remaining };
}

function headingKeywords(locale: Locale): string[] {
  const own = LIMITATIONS_HEADING_KEYWORDS.get(locale) ?? [];
  const english = LIMITATIONS_HEADING_KEYWORDS.get(Locale.EN) ?? [];
  return [...own, ...english].map(foldForMatch);
}

/** Every section whose heading names the limitations, with its non-empty lines as items. */
function limitationsSections(markdown: string, locale: Locale): MarkdownSection[] {
  const keywords = headingKeywords(locale);
  const sections: MarkdownSection[] = [];
  let open: MarkdownSection | null = null;
  for (const line of markdown.split(/\r?\n/u)) {
    const heading = HEADING_PATTERN.exec(line);
    if (heading) {
      const [, hashes = '#', rawTitle = ''] = heading;
      const level = hashes.length;
      if (open && level <= open.level) open = null;
      const title = foldForMatch(rawTitle);
      if (!open && keywords.some((keyword) => title.includes(keyword))) {
        open = { level, items: [] };
        sections.push(open);
      }
      continue;
    }
    const item = line.replace(LIST_MARKER_PATTERN, '').trim();
    if (open && item.length > 0) open.items.push(item);
  }
  return sections;
}

/**
 * Deterministic check before an article with accepted gaps is published: it has a limitations
 * section and every accepted gap is stated in one of its items. A gap is stated when at least half
 * of its topic words appear in an item; a gap with no topic words only needs the section to be
 * non-empty.
 */
export function hasLimitationsSection(
  markdown: string,
  accepted: readonly string[],
  locale: Locale,
): boolean {
  if (accepted.length === 0) return true;
  const items = limitationsSections(markdown, locale).flatMap((section) => section.items);
  if (items.length === 0) return false;
  const itemTokens = items.map((item) => tokensOf(item));
  return accepted.every((gap) => {
    const topic = specificTokens(gap);
    if (topic.size === 0) return true;
    const share = minShare(gap);
    return itemTokens.some((tokens) => countShared(topic, tokens) / topic.size >= share);
  });
}
