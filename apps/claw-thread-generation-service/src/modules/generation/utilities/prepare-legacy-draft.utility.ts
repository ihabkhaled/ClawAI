import type { AuthorDraft } from '../types/generation-pipeline.types';
import {
  BLANK_CHARACTER,
  HEX_CHARACTER,
  LEGACY_ID_MAX_CHARS,
  LEGACY_ID_MIN_CHARS,
  LEGACY_ID_SEPARATORS,
  LEGACY_URL_END_CHARACTER,
  LEGACY_URL_SCHEME,
  LEGACY_URL_SCHEME_MAX_CHARS,
  UNTITLED_PLACEHOLDER,
} from '../constants/legacy-draft.constants';
import { headingsOf } from './format-markdown-scan.utility';

/** First index at or after `from` that ends an address (or the text's length). */
function addressEnd(text: string, from: number): number {
  let index = from;
  while (index < text.length && !LEGACY_URL_END_CHARACTER.test(text.charAt(index))) index += 1;
  return index;
}

/** After an address that ends at `end`: the `[id_start, close]` of `, <hex id>]`, or null. */
function idAfter(text: string, end: number): readonly [number, number] | null {
  if (end >= text.length || !LEGACY_ID_SEPARATORS.includes(text.charAt(end))) return null;
  let idStart = end + 1;
  while (BLANK_CHARACTER.test(text.charAt(idStart))) idStart += 1;
  let close = idStart;
  while (close - idStart < LEGACY_ID_MAX_CHARS && HEX_CHARACTER.test(text.charAt(close))) {
    close += 1;
  }
  return close - idStart >= LEGACY_ID_MIN_CHARS && text.charAt(close) === ']'
    ? [idStart, close]
    : null;
}

/**
 * Every `[<http(s) address><, or ;><blanks><8-32 hex id>]`, leftmost first, replaced by
 * `replace(address, id)`: the matches of the earlier global regex, found in linear time. The end
 * of an address and what follows it are looked up once however many `[` share them.
 */
function replaceLegacyMarkers(text: string, replace: (url: string, id: string) => string): string {
  const tails = new Map<number, readonly [number, number] | null>();
  let output = '';
  let copied = 0;
  let end = -1;
  let open = text.indexOf('[');
  while (open >= 0) {
    const scheme = LEGACY_URL_SCHEME.exec(
      text.slice(open + 1, open + 1 + LEGACY_URL_SCHEME_MAX_CHARS),
    );
    if (scheme !== null) {
      if (end < open + 1) end = addressEnd(text, open + 1);
      if (!tails.has(end)) tails.set(end, idAfter(text, end));
      const tail = end > open + 1 + scheme[0].length ? tails.get(end) : null;
      if (tail) {
        const [idStart, close] = tail;
        output +=
          text.slice(copied, open) + replace(text.slice(open + 1, end), text.slice(idStart, close));
        copied = close + 1;
        open = text.indexOf('[', copied);
        continue;
      }
    }
    open = text.indexOf('[', open + 1);
  }
  return output + text.slice(copied);
}

/**
 * An article stored by an older release can carry two shapes the typesetter's guard cannot
 * reason about: citation markers written as `[address, id]` (the guard only knows `[id]`, so the
 * model's cleanup reads as a lost or added citation) and no H1 at all (the guard demands exactly
 * one). Both are normalised BEFORE the pass, and the normalised text is the baseline the guard
 * compares with, so the model is judged on layout only. A pair of a known source becomes `[id]`; an
 * unknown pair is removed.
 */
export function prepareLegacyDraft(draft: AuthorDraft, title: string): AuthorDraft {
  const known = new Map(
    draft.citations.map(({ evidenceId }) => [evidenceId.toLowerCase(), evidenceId]),
  );
  const byUrl = new Map(
    draft.citations.map(({ evidenceId, url }) => [url.toLowerCase(), evidenceId]),
  );
  let markdown = replaceLegacyMarkers(draft.markdown, (url, id) => {
    const evidenceId = known.get(id.toLowerCase()) ?? byUrl.get(url.toLowerCase());
    return evidenceId === undefined ? '' : `[${evidenceId}]`;
  });
  if (!headingsOf(markdown).some(({ level }) => level === 1)) {
    const heading = title.trim();
    if (heading !== '' && heading !== UNTITLED_PLACEHOLDER) {
      markdown = `# ${heading}\n\n${markdown.trimStart()}`;
    }
  }
  return { ...draft, markdown };
}
