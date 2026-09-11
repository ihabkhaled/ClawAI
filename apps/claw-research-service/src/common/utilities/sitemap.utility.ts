import { HTML_ATTR_RE, HTML_ENTITY_MAP, HTML_ENTITY_RE } from '../constants/html-extract.constants';
import {
  SITEMAP_ALTERNATE_LINK_RE,
  SITEMAP_CDATA_RE,
  SITEMAP_CHANGEFREQ_RE,
  SITEMAP_INDEX_ROOT_RE,
  SITEMAP_LASTMOD_RE,
  SITEMAP_LOC_RE,
  SITEMAP_PRIORITY_RE,
  SITEMAP_SITEMAP_ENTRY_RE,
  SITEMAP_URL_ENTRY_RE,
  SITEMAP_URLSET_ROOT_RE,
} from '../constants/sitemap.constants';
import type { HreflangAlternate } from '../types/html-extract.types';
import type {
  SitemapIndexEntry,
  SitemapParseResult,
  SitemapUrlEntry,
} from '../types/sitemap.types';

/**
 * A `sitemap.xml` (or `sitemap_index.xml`) parser covering the sitemaps.org
 * schema plus the hreflang extension. No XML library: the format is regular
 * enough (no attributes on the tags this reads, aside from the hreflang
 * links) that the same hand-rolled tag-matching already used for Bing's RSS
 * fallback (`ollama-web.adapter.ts`) covers it, without a new dependency.
 *
 * Gzip-compressed sitemaps are NOT decompressed here — the caller must hand
 * over already-decompressed text. Recursing into a `sitemapindex`'s nested
 * sitemaps is the crawl orchestrator's job (it needs to fetch each one),
 * not this pure parser's.
 */
export function parseSitemapXml(xml: string): SitemapParseResult {
  if (SITEMAP_INDEX_ROOT_RE.test(xml)) {
    return { kind: 'sitemapindex', sitemaps: parseSitemapIndexEntries(xml) };
  }
  if (SITEMAP_URLSET_ROOT_RE.test(xml)) {
    return { kind: 'urlset', entries: parseUrlsetEntries(xml) };
  }
  return { kind: 'unrecognized' };
}

function parseSitemapIndexEntries(xml: string): SitemapIndexEntry[] {
  const entries: SitemapIndexEntry[] = [];
  const pattern = clone(SITEMAP_SITEMAP_ENTRY_RE);
  for (const match of xml.matchAll(pattern)) {
    const block = match[1] ?? '';
    const loc = readTagText(block, SITEMAP_LOC_RE);
    if (loc === null) {
      continue;
    }
    entries.push({ loc, lastmod: readTagText(block, SITEMAP_LASTMOD_RE) });
  }
  return entries;
}

function parseUrlsetEntries(xml: string): SitemapUrlEntry[] {
  const entries: SitemapUrlEntry[] = [];
  const pattern = clone(SITEMAP_URL_ENTRY_RE);
  for (const match of xml.matchAll(pattern)) {
    const block = match[1] ?? '';
    const loc = readTagText(block, SITEMAP_LOC_RE);
    if (loc === null) {
      continue;
    }
    entries.push({
      loc,
      lastmod: readTagText(block, SITEMAP_LASTMOD_RE),
      changefreq: readTagText(block, SITEMAP_CHANGEFREQ_RE),
      priority: parsePriority(readTagText(block, SITEMAP_PRIORITY_RE)),
      hreflangAlternates: parseHreflangAlternates(block),
    });
  }
  return entries;
}

function parseHreflangAlternates(urlBlock: string): HreflangAlternate[] {
  const alternates: HreflangAlternate[] = [];
  const pattern = clone(SITEMAP_ALTERNATE_LINK_RE);
  for (const match of urlBlock.matchAll(pattern)) {
    const tag = match[0];
    const hreflangMatch = tag.match(HTML_ATTR_RE.hreflang);
    const hrefMatch = tag.match(HTML_ATTR_RE.href);
    const hreflang = hreflangMatch?.[1];
    const href = hrefMatch?.[1];
    if (hreflang !== undefined && href !== undefined) {
      alternates.push({ lang: hreflang, url: decodeXmlText(href) });
    }
  }
  return alternates;
}

function parsePriority(raw: string | null): number | null {
  if (raw === null) {
    return null;
  }
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

function readTagText(container: string, pattern: RegExp): string | null {
  const match = container.match(pattern);
  const raw = match?.[1];
  if (raw === undefined) {
    return null;
  }
  const trimmed = raw.trim();
  const cdataMatch = trimmed.match(SITEMAP_CDATA_RE);
  const unwrapped = cdataMatch?.[1] ?? trimmed;
  return decodeXmlText(unwrapped.trim());
}

function decodeXmlText(value: string): string {
  return value.replaceAll(
    HTML_ENTITY_RE,
    (match, entity: string) => HTML_ENTITY_MAP.get(entity) ?? match,
  );
}

/** A fresh copy of a `/g` regex, so this call's matching never inherits `lastIndex` left over from a previous call sharing the same module-level constant. */
function clone(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags);
}
