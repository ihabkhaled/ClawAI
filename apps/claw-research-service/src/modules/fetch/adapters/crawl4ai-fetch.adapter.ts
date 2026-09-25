import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { FETCH_DEFAULT_TIMEOUT_MS } from '../../../common/constants/fetch.constants';
import { assertSafeOutboundUrl } from '../../../common/utilities/url-safety.utility';
import { FetchStrategyKind } from '../../../generated/prisma';
import {
  CRAWL4AI_TOKEN_MISSING_MESSAGE,
  SIDECAR_DEFAULT_BASE_URL,
} from '../constants/fetch-strategy.constants';
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
 *
 * Since 0.9.2 the server binds 0.0.0.0 only when `CRAWL4AI_API_TOKEN` is set,
 * and then requires `Authorization: Bearer <token>` on every route except
 * `/health`. The same secret reaches us through AppConfig. Without it the
 * sidecar is unreachable by design, so `supports` answers false and the
 * orchestrator skips this tier instead of paying an ECONNREFUSED per fetch.
 */
@Injectable()
export class Crawl4AiFetchAdapter implements FetchStrategyAdapter {
  readonly kind = FetchStrategyKind.CRAWL4AI;
  private readonly logger = new Logger(Crawl4AiFetchAdapter.name);
  private missingTokenReported = false;

  /** Availability, not applicability: every URL is fine once a token exists. */
  supports(_url: string): boolean {
    return this.apiToken() !== undefined;
  }

  async fetchPage(request: FetchRequest): Promise<FetchResult> {
    const startedAt = Date.now();
    const credential = this.apiToken();
    if (credential === undefined) {
      throw new Error(CRAWL4AI_TOKEN_MISSING_MESSAGE);
    }
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
      { Authorization: `Bearer ${credential}` },
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

  /** The configured token, or undefined — reporting its absence once per process. */
  private apiToken(): string | undefined {
    const token = AppConfig.get().CRAWL4AI_API_TOKEN;
    if (token === undefined && !this.missingTokenReported) {
      this.missingTokenReported = true;
      this.logger.warn(CRAWL4AI_TOKEN_MISSING_MESSAGE);
    }
    return token;
  }
}
