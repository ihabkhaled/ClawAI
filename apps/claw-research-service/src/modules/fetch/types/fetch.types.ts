import type { HtmlMetadata } from '../../../common/types/html-extract.types';

export type FetchRequest = {
  url: string;
  /** Override the adapter's default timeout. */
  timeoutMs?: number;
  /** If true, bypass the page cache and force a live fetch. */
  refresh?: boolean;
};

export type FetchResult = {
  url: string;
  finalUrl: string;
  httpStatus: number;
  mimeType: string | null;
  title: string | null;
  /** Extracted clean content, truncated to FETCH_MAX_CONTENT_LENGTH. */
  content: string;
  links: string[];
  byteSize: number;
  /** Did this result come from the page cache? */
  cacheHit: boolean;
  latencyMs: number;
  /**
   * Raw, untruncated body. Populated by the live HTTP adapter for
   * `RAW_BODY_PRESERVED_MIME_TYPES` (HTML, so downstream scrape extractors
   * can parse structure — headings, tables, etc. — and XML, so a sitemap or
   * feed parser sees the whole document rather than one cut at
   * `FETCH_MAX_CONTENT_LENGTH`). NOT persisted to PageCache — in-memory for
   * the current request only. Cache hits have this set to `undefined`;
   * callers must re-fetch with `refresh: true` to get it again, or accept
   * the stripped/truncated `content` as input.
   */
  rawHtml?: string;
  /**
   * Head metadata (canonical, hreflang, OG, Twitter card, JSON-LD) for
   * text/html responses; absent for every other MIME type. Best-effort from
   * the raw markup only — a page whose tags are injected by client-side JS
   * will not have them here without a rendered-DOM fetch.
   */
  metadata?: HtmlMetadata;
};
