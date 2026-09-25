/** What a sidecar adapter hands `buildSidecarResult` after its call returns. */
export type SidecarPage = {
  requestedUrl: string;
  /** Where the sidecar says it ended up, after its own redirects. */
  finalUrl: string;
  httpStatus: number;
  /** Full HTML when the sidecar returned it — preferred, so extraction matches every other tier. */
  html: string | null;
  /** The sidecar's own Markdown, used only when it returned no HTML. */
  markdown: string | null;
  title: string | null;
  startedAt: number;
};

/** Crawl4AI `POST /crawl` — only the fields we read. */
export type Crawl4AiCrawlResponse = {
  success?: boolean;
  results?: Array<{
    url?: string;
    success?: boolean;
    status_code?: number | null;
    html?: string | null;
    redirected_url?: string | null;
    error_message?: string | null;
    markdown?: string | { raw_markdown?: string } | null;
    metadata?: { title?: string | null } | null;
  }>;
};

/** FlareSolverr `POST /v1` — only the fields we read. */
export type FlareSolverrResponse = {
  status?: string;
  message?: string;
  solution?: {
    url?: string;
    status?: number;
    response?: string;
  };
};

/** Firecrawl `POST /v2/scrape` — only the fields we read. */
export type FirecrawlScrapeResponse = {
  success?: boolean;
  error?: string;
  data?: {
    rawHtml?: string;
    markdown?: string;
    metadata?: {
      title?: string;
      statusCode?: number;
      url?: string;
      sourceURL?: string;
    };
  };
};
