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
   * Raw HTML body. Populated by the live HTTP adapter for text/html
   * responses so downstream scrape extractors can parse structure
   * (headings, tables, etc.). NOT persisted to PageCache — in-memory
   * for the current request only. Cache hits have this set to
   * `undefined`; callers must re-fetch with `refresh: true` to get
   * raw HTML again, or accept the stripped `content` as input.
   */
  rawHtml?: string;
};
