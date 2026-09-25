import type { FetchStrategyKind } from '../../../generated/prisma';
import type { SidecarHealthState } from '../enums/sidecar-health-state.enum';

/** How one sidecar is probed for `/health`: the key it is reported under and a cheap GET path. */
export type SidecarHealthProbe = {
  /** The `fetch_strategy_configs` row that says whether it is enabled and where it lives. */
  kind: FetchStrategyKind;
  /** `services.<key>` in research-service `/health`; health-service's row name. */
  key: string;
  /** A route the sidecar answers without a credential and without doing any work. */
  path: string;
  /** Used when the row's `publicConfig.baseUrl` is missing or not http(s). */
  defaultBaseUrl: string | undefined;
};

/** `services` in research-service `/health`: one state per sidecar key. */
export type SidecarHealthReport = Record<string, SidecarHealthState>;

/** A health report kept for a short while, so `/health` is never a probe storm. */
export type CachedSidecarHealth = {
  report: SidecarHealthReport;
  expiresAtMs: number;
};

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
