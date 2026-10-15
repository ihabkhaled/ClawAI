import {
  BARE_URL_START,
  INTERNAL_ID,
  MARKER_CLOSERS,
  MARKER_OPENERS,
  MARKER_RUN_CHARACTER,
  MARKER_SEPARATOR,
  URL_ID_SEPARATORS,
  URL_MAX_CHARS,
} from '../constants/citation-marker.constants';
import type { MarkerCitation } from '../types/citation-marker.types';
import { foldDigits } from './digit-folding.utility';

function normaliseToken(token: string): string {
  return foldDigits(token.normalize('NFKC'))
    .replaceAll(/\p{Cf}/gu, '')
    .toLowerCase();
}

function normaliseUrl(url: string): string {
  return url.trim().replace(/\/+$/u, '').toLowerCase();
}

function ordinalIndex(citations: readonly MarkerCitation[]): {
  byId: Map<string, number>;
  byUrl: Map<string, number>;
} {
  const byId = new Map<string, number>();
  const byUrl = new Map<string, number>();
  for (const [index, { evidenceId, url }] of citations.entries()) {
    const id = normaliseToken(evidenceId);
    if (!byId.has(id)) byId.set(id, index + 1);
    const key = normaliseUrl(url);
    if (!byUrl.has(key)) byUrl.set(key, index + 1);
  }
  return { byId, byUrl };
}

/** A run made only of known ids and internal 16-hex ids: numbers for the known, '' for the rest. */
function resolveRun(run: string, byId: ReadonlyMap<string, number>): string {
  const tokens = run.split(MARKER_SEPARATOR).filter(Boolean).map(normaliseToken);
  if (tokens.length === 0) return run;
  const ordinals = new Set<number>();
  for (const token of tokens) {
    const ordinal = byId.get(token);
    if (ordinal !== undefined) {
      ordinals.add(ordinal);
      continue;
    }
    if (!INTERNAL_ID.test(token)) return run;
  }
  return ordinals.size === 0 ? '' : `[${[...ordinals].sort((a, b) => a - b).join(', ')}]`;
}

/**
 * `[https://example.com/a]` is a bracketed address: a known source becomes its number, any other
 * becomes the bare address. Returns null when the text at `open` is not such a form (a markdown
 * link `[https://x](https://x)` is left alone).
 */
function resolveBracketedUrl(
  text: string,
  open: number,
  byUrl: ReadonlyMap<string, number>,
): { replacement: string; end: number } | null {
  if (!BARE_URL_START.test(text.slice(open + 1, open + 9))) return null;
  const limit = Math.min(text.length, open + 1 + URL_MAX_CHARS);
  let cursor = open + 1;
  while (cursor < limit) {
    const character = text.charAt(cursor);
    if (MARKER_CLOSERS.has(character)) break;
    if (/\s/u.test(character) || MARKER_OPENERS.has(character)) return null;
    cursor += 1;
  }
  if (cursor >= limit || !MARKER_CLOSERS.has(text.charAt(cursor))) return null;
  if (text.charAt(cursor + 1) === '(') return null;
  const url = text.slice(open + 1, cursor);
  const ordinal = byUrl.get(normaliseUrl(url));
  return { replacement: ordinal === undefined ? url : `[${String(ordinal)}]`, end: cursor + 1 };
}

/**
 * The legacy form `[https://example.com/a, efc2e342efd8b15e]`: one bracket holding an address and
 * its evidence id. A known source (by id, else by address) becomes its number; an unknown one is
 * removed, because neither half is readable as a citation. Null when the text at `open` is not
 * this form, so every other bracket falls through to the other resolvers.
 */
function resolveUrlIdPair(
  text: string,
  open: number,
  index: { byId: ReadonlyMap<string, number>; byUrl: ReadonlyMap<string, number> },
): { replacement: string; end: number } | null {
  if (!BARE_URL_START.test(text.slice(open + 1, open + 9))) return null;
  const limit = Math.min(text.length, open + 1 + URL_MAX_CHARS);
  let cursor = open + 1;
  while (cursor < limit && !MARKER_CLOSERS.has(text.charAt(cursor))) {
    if (MARKER_OPENERS.has(text.charAt(cursor))) return null;
    cursor += 1;
  }
  if (cursor >= limit || text.charAt(cursor + 1) === '(') return null;
  const inside = text.slice(open + 1, cursor);
  const split = Math.max(...[...URL_ID_SEPARATORS].map((mark) => inside.lastIndexOf(mark)));
  if (split <= 0) return null;
  const address = inside.slice(0, split).trim();
  const id = normaliseToken(inside.slice(split + 1).trim());
  if (/\s/u.test(address) || !INTERNAL_ID.test(id)) return null;
  const ordinal = index.byId.get(id) ?? index.byUrl.get(normaliseUrl(address));
  const end = cursor + 1;
  return { replacement: ordinal === undefined ? '' : `[${String(ordinal)}]`, end };
}

/** The index of the last closing bracket inside the run `(open, runEnd)`, or -1. */
function lastCloserIn(text: string, open: number, runEnd: number): number {
  for (let cursor = runEnd - 1; cursor > open; cursor -= 1) {
    if (MARKER_CLOSERS.has(text.charAt(cursor))) return cursor;
  }
  return -1;
}

/**
 * Turns the internal source markers in an article into numbered citations, or removes them (the
 * public reader only has numbered sources). Handles `[id]`, `[id1, id2]`, `[[id1], [id2]]`, ids in
 * Arabic-Indic or other digits, full-width and CJK brackets, and bracketed addresses. `[1]` style
 * numbers and ordinary bracketed text are kept. A linear scan: an unclosed `[` never costs more
 * than its own run, so hostile text cannot make this quadratic.
 */
export function resolveCitationMarkers(
  markdown: string,
  citations: readonly MarkerCitation[],
): string {
  const { byId, byUrl } = ordinalIndex(citations);
  let output = '';
  let index = 0;
  while (index < markdown.length) {
    let open = index;
    while (open < markdown.length && !MARKER_OPENERS.has(markdown.charAt(open))) open += 1;
    output += markdown.slice(index, open);
    if (open >= markdown.length) break;
    const pair = resolveUrlIdPair(markdown, open, { byId, byUrl });
    if (pair) {
      output += pair.replacement;
      index = pair.end;
      if (
        pair.replacement === '' &&
        /\s$/u.test(output) &&
        /^[ \t]/u.test(markdown.charAt(index))
      ) {
        index += 1;
      }
      continue;
    }
    const url = resolveBracketedUrl(markdown, open, byUrl);
    if (url) {
      output += url.replacement;
      index = url.end;
      continue;
    }
    let runEnd = open + 1;
    while (runEnd < markdown.length && MARKER_RUN_CHARACTER.test(markdown.charAt(runEnd))) {
      runEnd += 1;
    }
    const close = lastCloserIn(markdown, open, runEnd);
    if (close < 0) {
      output += markdown.slice(open, runEnd);
      index = runEnd;
      continue;
    }
    const resolved = resolveRun(markdown.slice(open, close + 1), byId);
    output += resolved;
    index = close + 1;
    // A removed marker between two spaces leaves one space, not two.
    if (resolved === '' && /\s$/u.test(output) && /^[ \t]/u.test(markdown.charAt(index))) {
      index += 1;
    }
  }
  return output;
}
