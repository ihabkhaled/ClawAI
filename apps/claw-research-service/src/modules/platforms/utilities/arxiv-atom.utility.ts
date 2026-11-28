import { ARXIV_MAX_ENTRIES } from '../constants/platform-api.constants';
import { httpUrlOrNull, plainTextOf, stringOrNull } from './platform-text.utility';
import type { PlatformApiHit } from '../types/platform.types';

/**
 * Hits from an arXiv Atom feed, found with `indexOf` only (no regex over the
 * raw feed, no XML parser dependency). The body is already capped at
 * `PLATFORM_API_MAX_BYTES`; at most `ARXIV_MAX_ENTRIES` entries are scanned.
 * The feed-level `<title>` is never read: only tags inside `<entry>`.
 */
export function parseArxivAtom(xml: string, maxResults: number): PlatformApiHit[] {
  const hits: PlatformApiHit[] = [];
  let cursor = 0;
  for (let scanned = 0; scanned < ARXIV_MAX_ENTRIES && hits.length < maxResults; scanned += 1) {
    const start = xml.indexOf('<entry>', cursor);
    if (start < 0) {
      break;
    }
    const end = xml.indexOf('</entry>', start);
    if (end < 0) {
      break;
    }
    cursor = end + '</entry>'.length;
    const hit = entryToHit(xml.slice(start, end));
    if (hit !== null) {
      hits.push(hit);
    }
  }
  return hits;
}

function entryToHit(entry: string): PlatformApiHit | null {
  const title = plainTextOf(tagText(entry, 'title'));
  const id = httpUrlOrNull(tagText(entry, 'id')?.trim());
  if (title === null || id === null) {
    return null;
  }
  const published = stringOrNull(tagText(entry, 'published')?.trim());
  return {
    title,
    url: id.replace(/^http:\/\//u, 'https://'),
    snippet: plainTextOf(tagText(entry, 'summary')),
    publishedAt: published !== null && /^\d{4}-\d{2}-\d{2}/u.test(published) ? published : null,
  };
}

/** Text of the first `<tag …>…</tag>` inside an entry; null when absent or self-closing. */
function tagText(entry: string, tag: string): string | null {
  const open = entry.indexOf(`<${tag}`);
  if (open < 0) {
    return null;
  }
  const next = entry.charAt(open + tag.length + 1);
  if (next !== '>' && next !== ' ') {
    // `<titleX>` or `<id…` matching a longer tag name: not this tag.
    return null;
  }
  const close = entry.indexOf('>', open);
  const end = close < 0 ? -1 : entry.indexOf(`</${tag}>`, close);
  const selfClosing = close >= 0 && entry.charAt(close - 1) === '/';
  return close < 0 || end < 0 || selfClosing ? null : entry.slice(close + 1, end);
}
