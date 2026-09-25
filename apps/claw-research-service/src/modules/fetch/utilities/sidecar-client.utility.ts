import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';

import {
  FETCH_MAX_CONTENT_LENGTH,
  FETCH_MAX_LINKS,
  SIDECAR_MAX_RESPONSE_BYTES,
} from '../../../common/constants/fetch.constants';
import {
  assertSafeOutboundUrl,
  isCloudMetadataHost,
} from '../../../common/utilities/url-safety.utility';
import { readLimitedBody } from './limited-body.utility';
import { extractPageContent } from './page-content.utility';
import type { FetchResult } from '../types/fetch.types';
import type { SidecarPage } from '../types/sidecar.types';

/**
 * POSTs JSON to one of our own scraping sidecars (Crawl4AI, FlareSolverr,
 * Firecrawl) on the private `claw-scrapers` network and parses the reply.
 *
 * The sidecar's base URL is an internal compose name, so it is not run
 * through the outbound SSRF guard (it IS a private host, on purpose) — but
 * it may never be a cloud-metadata address, whatever an admin typed.
 *
 * `extraHeaders` carries a sidecar's own credential (Crawl4AI's Bearer
 * token). It is sent and nothing else: no error or log line built here
 * ever includes a header value.
 */
export async function postSidecarJson<T>(
  baseUrl: string,
  path: string,
  body: unknown,
  timeoutMs: number,
  extraHeaders: Readonly<Record<string, string>> = {},
): Promise<T> {
  const endpoint = new URL(path, baseUrl);
  if (isCloudMetadataHost(endpoint.hostname)) {
    throw new Error(`Refusing sidecar base URL on a metadata host: ${endpoint.hostname}`);
  }
  assertSafeRequestUrl(endpoint.href, declaredHost(baseUrl));
  const response = await fetch(endpoint.href, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      ...extraHeaders,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const bytes = await readLimitedBody(response.body, SIDECAR_MAX_RESPONSE_BYTES);
  if (!response.ok) {
    throw new Error(`Sidecar ${endpoint.host} answered HTTP ${String(response.status)}`);
  }
  return JSON.parse(bytes.toString('utf8')) as T;
}

/**
 * Builds a `FetchResult` from what a sidecar returned. The target URL was
 * SSRF-checked before the call; the sidecar followed its own redirects, so
 * the FINAL URL it reports is checked again here and the page is refused if
 * it ended on a host we would not have fetched. (The sidecar has already
 * made that request inside its isolated network — see ADR-121 §6 for why
 * that network cannot reach our services.)
 */
export function buildSidecarResult(page: SidecarPage): FetchResult {
  assertSafeOutboundUrl(page.finalUrl, { allowPrivateHosts: false });
  const extracted =
    page.html !== null && page.html.length > 0
      ? extractPageContent(page.html, page.finalUrl)
      : null;
  const content = extracted?.content ?? page.markdown ?? '';
  return {
    url: page.requestedUrl,
    finalUrl: page.finalUrl,
    httpStatus: page.httpStatus,
    mimeType: extracted === null ? 'text/markdown' : 'text/html',
    title: extracted?.title ?? page.title,
    content: content.slice(0, FETCH_MAX_CONTENT_LENGTH),
    links: (extracted?.links ?? []).slice(0, FETCH_MAX_LINKS),
    byteSize: (page.html ?? page.markdown ?? '').length,
    cacheHit: false,
    latencyMs: Date.now() - page.startedAt,
    rawHtml: page.html ?? undefined,
    metadata: extracted?.metadata,
    renderedWithHeadlessBrowser: true,
  };
}
