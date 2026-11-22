import type { FetchStrategyKind } from '../../../generated/prisma';
import type { HtmlMetadata } from '../../../common/types/html-extract.types';
import type { PageExtractionKind } from '../enums/page-extraction-kind.enum';

export type FetchRequest = {
  url: string;
  /** Override the adapter's default timeout. */
  timeoutMs?: number;
  /** If true, bypass the page cache and force a live fetch. */
  refresh?: boolean;
  /**
   * The strategy's `FetchStrategyConfig.publicConfig`, passed per call by the
   * orchestrator (e.g. a sidecar's base URL). Per call rather than stored on
   * the adapter, so two concurrent fetches never see each other's config.
   */
  strategyConfig?: Record<string, unknown>;
};

/**
 * What a tool-calling model is shown for one page: readable text and links, and
 * which tier read it. Never the raw HTML. Mirrors the shape of Ollama's hosted
 * `web_fetch` (`title`, `content`, `links`) plus the provenance (ADR-121).
 */
export type ToolFetchView = {
  url: string;
  title: string | null;
  content: string;
  links: string[];
  servedBy: FetchStrategyKind | null;
  /** Set only for an archived copy; the content also starts with a visible label. */
  archivedAt: string | null;
  /** Which extractor produced `content` (null on a cache hit or a non-HTML page). */
  extraction: PageExtractionKind | null;
  /** True when the page stayed a thin shell on every tier; `content` starts with a notice. */
  thinContent: boolean;
};

/** One escalation attempt, reduced to what may leave the service: which tier, and how it ended. No URL, body or error text. */
export type FetchAttemptSummary = {
  kind: FetchStrategyKind;
  outcome: 'SUCCESS' | 'BLOCKED' | 'ERROR';
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
  /**
   * `true` only when this result came from `HeadlessFetchAdapter` (a real
   * Chromium render), never set for the plain HTTP path. Absent, not
   * `false`, on every plain result — so a trace or log line can say
   * "rendered" only when it is actually true, per rule 41's ban on a
   * hardcoded value read as a measurement.
   */
  renderedWithHeadlessBrowser?: true;
  /**
   * Which escalation strategy produced this result (ADR-121). Set by the
   * orchestrator on every live fetch; absent on cache hits and legacy rows.
   */
  servedBy?: FetchStrategyKind;
  /**
   * The escalation trail that led to `servedBy`, in order (kind + outcome only).
   * Set with `servedBy` on every live fetch; absent on cache hits.
   */
  attempts?: readonly FetchAttemptSummary[];
  /**
   * ISO timestamp of the archive capture, set ONLY when the text is an
   * archived copy (Wayback), never a live fetch. The content itself also
   * starts with an "Archived copy, captured …" line, so no consumer that
   * ignores this field can mistake it for the live page.
   */
  archivedAt?: string;
  /**
   * Which extractor produced `content` (`extractPageContent`): the visible
   * article/text, the page's embedded state, or a site adapter. Absent on
   * cache hits and non-HTML results.
   */
  extraction?: PageExtractionKind;
  /** The site adapter's name, set only when `extraction` is SITE_ADAPTER. */
  siteAdapter?: string;
  /**
   * `true` only when every tier returned a thin shell and the chain fell back
   * to the live thin text (`markThinResult`): the content starts with a notice
   * and the page must not be presented as read. Absent otherwise.
   */
  thinContent?: true;
};
