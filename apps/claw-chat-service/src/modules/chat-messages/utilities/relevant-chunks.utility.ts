import {
  HEADING_BOUNDARY,
  PARAGRAPH_BOUNDARY,
  RELEVANT_CHUNK_GAP_MARKER,
  RELEVANT_CHUNK_MAX_CHARS,
  RELEVANT_CHUNK_MIN_TERM_LENGTH,
  RELEVANT_CHUNK_PREAMBLE_MAX_CHARS,
  RELEVANT_CHUNK_STOPWORDS,
  TERM_SEPARATOR,
} from '../constants/relevant-chunks.constants';
import {
  FILE_RELEVANCE_FIT_NOTE_BODY,
  FILE_RELEVANCE_FIT_NOTE_PREFIX,
  FILE_RELEVANCE_FIT_NOTE_RESERVE_CHARS,
  TEXT_BUDGET_MIN_ITEM_CHARS,
  TEXT_BUDGET_SHORTENED_MARKER,
} from '../constants/evidence-fit.constants';
import type { PartialChunk, ScoredChunk } from '../types/relevant-chunks.types';
import type { TextBudgetResult } from '../types/evidence-fit.types';
import { fitTextsToBudget } from './text-budget.utility';

/**
 * Splits markdown into chunks on headings, then blank lines, then hard size.
 * Lossless: `chunkMarkdown(text).join('') === text`.
 */
export function chunkMarkdown(text: string): string[] {
  const sections: string[] = [];
  let start = 0;
  for (const match of text.matchAll(HEADING_BOUNDARY)) {
    const end = match.index + 1;
    if (end > start) sections.push(text.slice(start, end));
    start = end;
  }
  if (start < text.length) sections.push(text.slice(start));
  return sections.flatMap(splitOversized);
}

function splitOversized(section: string): string[] {
  if (section.length <= RELEVANT_CHUNK_MAX_CHARS) return [section];
  const pieces: string[] = [];
  let current = '';
  for (const paragraph of section.split(PARAGRAPH_BOUNDARY)) {
    if (current.length + paragraph.length <= RELEVANT_CHUNK_MAX_CHARS) {
      current += paragraph;
      continue;
    }
    if (current.length > 0) pieces.push(current);
    current = '';
    if (paragraph.length <= RELEVANT_CHUNK_MAX_CHARS) {
      current = paragraph;
      continue;
    }
    for (let offset = 0; offset < paragraph.length; offset += RELEVANT_CHUNK_MAX_CHARS) {
      pieces.push(paragraph.slice(offset, offset + RELEVANT_CHUNK_MAX_CHARS));
    }
  }
  if (current.length > 0) pieces.push(current);
  return pieces;
}

function termsOf(text: string): Set<string> {
  const terms = new Set<string>();
  for (const raw of text.toLowerCase().split(TERM_SEPARATOR)) {
    if ([...raw].length < RELEVANT_CHUNK_MIN_TERM_LENGTH) continue;
    if (RELEVANT_CHUNK_STOPWORDS.has(raw)) continue;
    terms.add(raw);
  }
  return terms;
}

/** Leading chunks that together fit the preamble allowance (at least one, cut if needed). */
function preambleOf(chunks: readonly string[]): { text: string; count: number } {
  let text = '';
  let count = 0;
  for (const chunk of chunks) {
    if (text.length + chunk.length > RELEVANT_CHUNK_PREAMBLE_MAX_CHARS) break;
    text += chunk;
    count += 1;
  }
  return count === 0
    ? { text: (chunks[0] ?? '').slice(0, RELEVANT_CHUNK_PREAMBLE_MAX_CHARS), count: 1 }
    : { text, count };
}

function scoreChunks(
  chunked: readonly string[][],
  firstCandidate: readonly number[],
  query: string,
): ScoredChunk[] {
  const queryTerms = termsOf(query);
  const candidates: Array<{ textIndex: number; chunkIndex: number; terms: Set<string> }> = [];
  for (const [textIndex, chunks] of chunked.entries()) {
    for (
      let chunkIndex = firstCandidate.at(textIndex) ?? 0;
      chunkIndex < chunks.length;
      chunkIndex += 1
    ) {
      candidates.push({ textIndex, chunkIndex, terms: termsOf(chunks.at(chunkIndex) ?? '') });
    }
  }
  const documentFrequency = new Map<string, number>();
  for (const term of queryTerms) {
    documentFrequency.set(term, candidates.filter((c) => c.terms.has(term)).length);
  }
  return candidates.map((candidate) => {
    let score = 0;
    for (const term of queryTerms) {
      const frequency = documentFrequency.get(term) ?? 0;
      if (frequency > 0 && candidate.terms.has(term)) {
        score += Math.log(1 + candidates.length / frequency);
      }
    }
    return { textIndex: candidate.textIndex, chunkIndex: candidate.chunkIndex, score };
  });
}

function assemble(
  chunks: readonly string[],
  preamble: { text: string; count: number },
  selected: readonly number[],
  partial: PartialChunk | undefined,
): string {
  let out = preamble.text;
  let previous = preamble.count - 1;
  let cut = false;
  const indexes = partial === undefined ? [...selected] : [...selected, partial.chunkIndex];
  for (const index of indexes.sort((a, b) => a - b)) {
    if (cut || index !== previous + 1) out += RELEVANT_CHUNK_GAP_MARKER;
    cut = index === partial?.chunkIndex;
    out += cut ? (partial?.text ?? '') : (chunks.at(index) ?? '');
    previous = index;
  }
  if (cut || previous < chunks.length - 1) out += RELEVANT_CHUNK_GAP_MARKER;
  return out;
}

/**
 * Fits large texts into `maxChars` by keeping the parts that answer `query`.
 *
 * Each text keeps its preamble (what the document is, who it is about), then
 * chunks are added best-first by rarity-weighted term overlap with the
 * question until the budget is spent. Ties — including "nothing matched" —
 * fall back to document order, so a generic question still gets the head.
 */
export function fitTextsByRelevance(
  texts: readonly string[],
  maxChars: number,
  query: string,
): TextBudgetResult {
  const total = texts.reduce((sum, text) => sum + text.length, 0);
  if (total <= maxChars || texts.length === 0) return { texts: [...texts], dropped: 0 };

  const chunked = texts.map((text) => chunkMarkdown(text));
  const preambles = chunked.map((chunks) => preambleOf(chunks));
  // Each text may end with one trailing gap marker; reserve it up front.
  let used = preambles.reduce(
    (sum, preamble) => sum + preamble.text.length + RELEVANT_CHUNK_GAP_MARKER.length,
    0,
  );
  if (used > maxChars) return fitTextsToBudget(texts, maxChars);

  const ranked = scoreChunks(
    chunked,
    preambles.map((preamble) => preamble.count),
    query,
  ).sort((a, b) => b.score - a.score || a.textIndex - b.textIndex || a.chunkIndex - b.chunkIndex);

  const selected = chunked.map((): number[] => []);
  let firstSkipped: ScoredChunk | undefined;
  for (const candidate of ranked) {
    const cost =
      (chunked.at(candidate.textIndex)?.at(candidate.chunkIndex)?.length ?? 0) +
      RELEVANT_CHUNK_GAP_MARKER.length;
    if (used + cost > maxChars) {
      firstSkipped ??= candidate;
      continue;
    }
    selected.at(candidate.textIndex)?.push(candidate.chunkIndex);
    used += cost;
  }
  const partial = fillRemainingRoom(chunked, firstSkipped, maxChars - used);

  return {
    texts: chunked.map((chunks, index) =>
      assemble(
        chunks,
        preambles.at(index) ?? { text: '', count: 0 },
        selected.at(index) ?? [],
        partial?.textIndex === index ? partial : undefined,
      ),
    ),
    dropped: 0,
  };
}

/**
 * The head of the best chunk that did not fit whole, cut to the room left.
 * Whole chunks alone leave up to one chunk of the budget unused, and a caller
 * that later refits to the full share (a compare lane, helper vision) then
 * finds the prompt bigger than the composer planned for.
 */
function fillRemainingRoom(
  chunked: readonly string[][],
  candidate: ScoredChunk | undefined,
  room: number,
): PartialChunk | undefined {
  const usable = room - RELEVANT_CHUNK_GAP_MARKER.length;
  if (candidate === undefined || usable < TEXT_BUDGET_MIN_ITEM_CHARS) return undefined;
  const chunk = chunked.at(candidate.textIndex)?.at(candidate.chunkIndex) ?? '';
  return {
    textIndex: candidate.textIndex,
    chunkIndex: candidate.chunkIndex,
    text: chunk.slice(0, usable),
  };
}

/**
 * Fits attached files' texts: whole when they fit, otherwise by relevance.
 *
 * Each file is first fitted on its own to `perFileMaxChars` over its WHOLE
 * text, so a per-file cap never head-cuts away the passage the question is
 * about (ADR-219); then all files together to `totalMaxChars`. A file that
 * did not arrive whole opens with the honest note saying how much of it the
 * model sees. A file the fit could only head-cut (budget below its preamble)
 * keeps `TEXT_BUDGET_SHORTENED_MARKER` and gets no relevance note.
 */
export function fitFileTextsByRelevance(
  texts: readonly string[],
  totalMaxChars: number,
  perFileMaxChars: number,
  query: string,
): TextBudgetResult {
  const reserve = FILE_RELEVANCE_FIT_NOTE_RESERVE_CHARS;
  const perFile = texts.map((text) =>
    text.length <= perFileMaxChars
      ? text
      : (fitTextsByRelevance([text], Math.max(perFileMaxChars - reserve, 0), query).texts[0] ?? ''),
  );
  const fitted = fitTogether(perFile, totalMaxChars, reserve, query);
  return {
    texts: fitted.texts.map((text, index) => {
      const original = texts.at(index) ?? '';
      return text === original || text.length === 0 || text.includes(TEXT_BUDGET_SHORTENED_MARKER)
        ? text
        : `${relevanceFitNote(text.length, original.length)}${text}`;
    }),
    dropped: fitted.dropped,
  };
}

/**
 * Files no bigger than an even share of the budget stay whole; the larger ones
 * share what is left, by relevance. Without this a short file beside a huge one
 * lost its unmatched paragraphs to the huge file's passages.
 */
function fitTogether(
  texts: readonly string[],
  maxChars: number,
  reserve: number,
  query: string,
): TextBudgetResult {
  const total = texts.reduce((sum, text) => sum + text.length, 0);
  if (total <= maxChars || texts.length === 0) return { texts: [...texts], dropped: 0 };
  const evenShare = Math.floor(maxChars / texts.length);
  const largeIndexes = texts.flatMap((text, index) => (text.length > evenShare ? [index] : []));
  const smallChars = texts.reduce(
    (sum, text) => (text.length > evenShare ? sum : sum + text.length),
    0,
  );
  const large = fitTextsByRelevance(
    largeIndexes.map((index) => texts.at(index) ?? ''),
    Math.max(maxChars - smallChars - reserve * largeIndexes.length, 0),
    query,
  );
  const positionOf = new Map(largeIndexes.map((index, position) => [index, position]));
  const out = texts.map((text, index) => {
    const position = positionOf.get(index);
    return position === undefined ? text : (large.texts.at(position) ?? '');
  });
  // A large file the fit dropped entirely stays in place as '' so positions
  // still line up with the caller's files.
  return { texts: out, dropped: largeIndexes.length - large.texts.length };
}

function relevanceFitNote(shown: number, total: number): string {
  return `${FILE_RELEVANCE_FIT_NOTE_PREFIX}${FILE_RELEVANCE_FIT_NOTE_BODY.replace(
    '{SHOWN}',
    shown.toLocaleString('en-US'),
  ).replace('{TOTAL}', total.toLocaleString('en-US'))}`;
}
