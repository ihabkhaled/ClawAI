import { HTML_ATTR_RE, HTML_ENTITY_MAP, HTML_ENTITY_RE } from '../constants/html-extract.constants';
import {
  FEED_ATOM_ENTRY_RE,
  FEED_ATOM_ROOT_RE,
  FEED_CDATA_RE,
  FEED_PUBDATE_RE,
  FEED_PUBLISHED_RE,
  FEED_RSS_ITEM_RE,
  FEED_RSS_LINK_RE,
  FEED_RSS_ROOT_RE,
  FEED_TITLE_RE,
  FEED_UPDATED_RE,
} from '../constants/feed.constants';
import type { FeedEntry, FeedParseResult } from '../types/feed.types';

/**
 * RSS 2.0 / Atom feed parser, no XML library — same hand-rolled tag-matching
 * as `sitemap.utility.ts` and the pre-existing Bing-RSS search fallback.
 * Only what a crawl needs to turn feed entries into candidate URLs: title,
 * link, published/updated date. Everything else in the feed (categories,
 * enclosures, author) is left unread.
 */
export function parseFeedXml(xml: string): FeedParseResult {
  if (FEED_RSS_ROOT_RE.test(xml)) {
    return { kind: 'rss', entries: parseRssItems(xml) };
  }
  if (FEED_ATOM_ROOT_RE.test(xml)) {
    return { kind: 'atom', entries: parseAtomEntries(xml) };
  }
  return { kind: 'unrecognized' };
}

function parseRssItems(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = [];
  const pattern = clone(FEED_RSS_ITEM_RE);
  for (const match of xml.matchAll(pattern)) {
    const block = match[1] ?? '';
    const url = readTagText(block, FEED_RSS_LINK_RE);
    if (url === null || url.length === 0) {
      continue;
    }
    entries.push({
      title: readTagText(block, FEED_TITLE_RE),
      url,
      publishedAt: readTagText(block, FEED_PUBDATE_RE),
    });
  }
  return entries;
}

function parseAtomEntries(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = [];
  const pattern = clone(FEED_ATOM_ENTRY_RE);
  for (const match of xml.matchAll(pattern)) {
    const block = match[1] ?? '';
    const url = readAtomLink(block);
    if (url === null) {
      continue;
    }
    entries.push({
      title: readTagText(block, FEED_TITLE_RE),
      url,
      publishedAt: readTagText(block, FEED_UPDATED_RE) ?? readTagText(block, FEED_PUBLISHED_RE),
    });
  }
  return entries;
}

/**
 * Atom links are self-closing tags with an `href` attribute, and an entry
 * can carry several (`rel="self"`, `rel="edit"`, …). The one that matters
 * here has no `rel` at all (defaults to "alternate" per the Atom spec) or an
 * explicit `rel="alternate"`.
 */
function readAtomLink(entryBlock: string): string | null {
  const tagPattern = /<link\b[^>]*\/?>/gi;
  for (const match of entryBlock.matchAll(tagPattern)) {
    const tag = match[0];
    const rel = tag.match(HTML_ATTR_RE.rel)?.[1]?.toLowerCase();
    if (rel !== undefined && rel !== 'alternate') {
      continue;
    }
    const href = tag.match(HTML_ATTR_RE.href)?.[1];
    if (href !== undefined) {
      return decodeFeedText(href);
    }
  }
  return null;
}

function readTagText(container: string, pattern: RegExp): string | null {
  const match = container.match(pattern);
  const raw = match?.[1];
  if (raw === undefined) {
    return null;
  }
  const trimmed = raw.trim();
  const cdataMatch = trimmed.match(FEED_CDATA_RE);
  const unwrapped = cdataMatch?.[1] ?? trimmed;
  const text = decodeFeedText(unwrapped.trim());
  return text.length > 0 ? text : null;
}

function decodeFeedText(value: string): string {
  return value.replaceAll(
    HTML_ENTITY_RE,
    (match, entity: string) => HTML_ENTITY_MAP.get(entity) ?? match,
  );
}

/** A fresh copy of a `/g` regex so this call's matching never inherits `lastIndex` left over from a previous call sharing the same module-level constant. */
function clone(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags);
}
