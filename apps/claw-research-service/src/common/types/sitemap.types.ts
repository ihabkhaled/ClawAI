import type { HreflangAlternate } from './html-extract.types';

export type SitemapUrlEntry = {
  loc: string;
  lastmod: string | null;
  changefreq: string | null;
  /** Parsed 0.0-1.0, or null if absent/unparseable. */
  priority: number | null;
  hreflangAlternates: HreflangAlternate[];
};

export type SitemapIndexEntry = {
  loc: string;
  lastmod: string | null;
};

export type SitemapParseResult =
  | { kind: 'urlset'; entries: SitemapUrlEntry[] }
  | { kind: 'sitemapindex'; sitemaps: SitemapIndexEntry[] }
  /** Neither root element was found — not a sitemap file, or empty/malformed. */
  | { kind: 'unrecognized' };
