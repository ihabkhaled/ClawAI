import { Injectable } from '@nestjs/common';

import { FETCH_DEFAULT_TIMEOUT_MS } from '../../../common/constants/fetch.constants';
import { assertSafeOutboundUrl } from '../../../common/utilities/url-safety.utility';
import { FetchStrategyKind } from '../../../generated/prisma';
import { SIDECAR_DEFAULT_BASE_URL } from '../constants/fetch-strategy.constants';
import { buildSidecarResult, postSidecarJson } from '../utilities/sidecar-client.utility';
import { resolveStrategyBaseUrl } from '../utilities/strategy-config.utility';
import type { FetchStrategyAdapter } from './fetch-strategy-adapter.interface';
import type { FetchRequest, FetchResult } from '../types/fetch.types';
import type { Crawl4AiCrawlResponse } from '../types/sidecar.types';

/**
 * Sidecar (ADR-121, compose profile `crawl4ai`, seeded DISABLED): Crawl4AI's
 * Docker server renders the page in its own Playwright and returns the HTML.
 *
 * Pinned to `unclecode/crawl4ai:0.9.4` or later — 0.9.4 (2026-09-23) closed
 * two SSRF paths (robots.txt fetch, link preview) and an env-leak through
 * untrusted config. We still never rely on its own egress controls: the
 * target is SSRF-checked here before the call, the final URL after it, and
 * the container sits on a network with no route to our services.
 */
@Injectable()
export class Crawl4AiFetchAdapter implements FetchStrategyAdapter {
  readonly kind = FetchStrategyKind.CRAWL4AI;

  async fetchPage(request: FetchRequest): Promise<FetchResult> {
    const startedAt = Date.now();
    const target = assertSafeOutboundUrl(request.url, { allowPrivateHosts: false });
    const timeoutMs = request.timeoutMs ?? FETCH_DEFAULT_TIMEOUT_MS;
    const baseUrl = resolveStrategyBaseUrl(
      request.strategyConfig,
      SIDECAR_DEFAULT_BASE_URL[FetchStrategyKind.CRAWL4AI],
    );
    const reply = await postSidecarJson<Crawl4AiCrawlResponse>(
      baseUrl,
      '/crawl',
      {
        urls: [target.href],
        browser_config: { type: 'BrowserConfig', params: { headless: true } },
        crawler_config: {
          type: 'CrawlerRunConfig',
          params: { cache_mode: 'bypass', page_timeout: timeoutMs },
        },
      },
      timeoutMs,
    );
    const page = reply.results?.[0];
    if (reply.success !== true || page === undefined || page.success !== true) {
      throw new Error(`Crawl4AI failed: ${page?.error_message ?? 'no result'}`);
    }
    const markdown =
      typeof page.markdown === 'string' ? page.markdown : (page.markdown?.raw_markdown ?? null);
    return buildSidecarResult({
      requestedUrl: request.url,
      finalUrl: page.redirected_url ?? page.url ?? target.href,
      httpStatus: page.status_code ?? 200,
      html: page.html ?? null,
      markdown,
      title: page.metadata?.title ?? null,
      startedAt,
    });
  }
}
