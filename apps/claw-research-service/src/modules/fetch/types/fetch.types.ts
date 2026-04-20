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
};
