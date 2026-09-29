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
import type { ScoredChunk } from '../types/relevant-chunks.types';
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
      let chunkIndex = firstCandidate[textIndex] ?? 0;
      chunkIndex < chunks.length;
      chunkIndex += 1
    ) {
      candidates.push({ textIndex, chunkIndex, terms: termsOf(chunks[chunkIndex] ?? '') });
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
): string {
  let out = preamble.text;
  let previous = preamble.count - 1;
  for (const index of [...selected].sort((a, b) => a - b)) {
    if (index !== previous + 1) out += RELEVANT_CHUNK_GAP_MARKER;
    out += chunks[index] ?? '';
    previous = index;
  }
  if (previous < chunks.length - 1) out += RELEVANT_CHUNK_GAP_MARKER;
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
  for (const candidate of ranked) {
    const cost =
      (chunked[candidate.textIndex]?.[candidate.chunkIndex]?.length ?? 0) +
      RELEVANT_CHUNK_GAP_MARKER.length;
    if (used + cost > maxChars) continue;
    selected[candidate.textIndex]?.push(candidate.chunkIndex);
    used += cost;
  }

  return {
    texts: chunked.map((chunks, index) =>
      assemble(chunks, preambles[index] ?? { text: '', count: 0 }, selected[index] ?? []),
    ),
    dropped: 0,
  };
}
