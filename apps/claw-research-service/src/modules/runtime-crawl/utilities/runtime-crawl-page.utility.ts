import { sanitizeForLlm } from '../../../common/utilities/content-safety.utility';
import {
  RUNTIME_CRAWL_MAX_WARNING_LENGTH,
  RUNTIME_CRAWL_MAX_WARNINGS,
} from '../constants/runtime-crawl.constants';
import type { RuntimeCrawlPage, RuntimeCrawlRun } from '../../../generated/prisma';
import type {
  RuntimeCrawlPageBounds,
  RuntimeCrawlPageRow,
  RuntimeCrawlPageView,
  RuntimeCrawlRawPage,
  RuntimeCrawlRunView,
} from '../types/runtime-crawl.types';

/**
 * Bounds one page for storage and the wire: secrets redacted, prompt-injection
 * patterns flagged (the text is kept, never rewritten), text and links capped.
 * The title is read from the page as-is, never invented.
 */
export function toPageRow(
  page: RuntimeCrawlRawPage,
  ordinal: number,
  bounds: RuntimeCrawlPageBounds,
): RuntimeCrawlPageRow {
  const safety = sanitizeForLlm(page.text);
  const truncated = safety.text.length > bounds.maxTextChars;
  return {
    ordinal,
    url: page.url,
    title: page.title,
    text: truncated ? safety.text.slice(0, bounds.maxTextChars) : safety.text,
    textTruncated: truncated,
    links: boundLinks(page.links, bounds.maxLinks),
    discoveryMethod: page.discoveryMethod,
    injectionFlags: safety.detected,
  };
}

/** Absolute http(s) links only, de-duplicated, capped. */
export function boundLinks(links: string[], max: number): string[] {
  const seen = new Set<string>();
  for (const link of links) {
    if (seen.size >= max) {
      break;
    }
    if (/^https?:\/\//iu.test(link)) {
      seen.add(link);
    }
  }
  return [...seen];
}

export function boundWarnings(warnings: string[]): string[] {
  return warnings
    .slice(0, RUNTIME_CRAWL_MAX_WARNINGS)
    .map((warning) => warning.slice(0, RUNTIME_CRAWL_MAX_WARNING_LENGTH));
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function toPageView(page: RuntimeCrawlPage): RuntimeCrawlPageView {
  return {
    ordinal: page.ordinal,
    url: page.url,
    title: page.title,
    text: page.text,
    textTruncated: page.textTruncated,
    links: stringArray(page.links),
    discoveryMethod: page.discoveryMethod,
    injectionFlags: stringArray(page.injectionFlags),
  };
}

export function toRunView(run: RuntimeCrawlRun): RuntimeCrawlRunView {
  return {
    id: run.id,
    profile: run.profile,
    startUrl: run.startUrl,
    intent: run.intent,
    status: run.status,
    maxPages: run.maxPages,
    maxDepth: run.maxDepth,
    pagesFetched: run.pagesFetched,
    errorCode: run.errorCode,
    errorMessage: run.errorMessage,
    warnings: stringArray(run.warnings),
    startedAt: run.startedAt,
    completedAt: run.completedAt,
  };
}
