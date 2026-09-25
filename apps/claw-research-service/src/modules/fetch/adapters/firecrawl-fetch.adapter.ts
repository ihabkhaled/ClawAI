import { Injectable } from '@nestjs/common';

import { FETCH_DEFAULT_TIMEOUT_MS } from '../../../common/constants/fetch.constants';
import { assertSafeOutboundUrl } from '../../../common/utilities/url-safety.utility';
import { FetchStrategyKind } from '../../../generated/prisma';
import { SIDECAR_DEFAULT_BASE_URL } from '../constants/fetch-strategy.constants';
import { buildSidecarResult, postSidecarJson } from '../utilities/sidecar-client.utility';
import { resolveStrategyBaseUrl } from '../utilities/strategy-config.utility';
import type { FetchStrategyAdapter } from './fetch-strategy-adapter.interface';
import type { FetchRequest, FetchResult } from '../types/fetch.types';
import type { FirecrawlScrapeResponse } from '../types/sidecar.types';

/**
 * Sidecar (ADR-121, compose profile `firecrawl`, seeded DISABLED): a
 * self-hosted Firecrawl API (`POST /v2/scrape`). The heaviest option — the
 * API, its Playwright service, Redis, RabbitMQ and Postgres together want
 * 8-12 GB — so it is the last renderer before the reader proxy and only
 * exists when its profile is started. Self-hosted: no Firecrawl cloud key,
 * no page leaves this deployment.
 */
@Injectable()
export class FirecrawlFetchAdapter implements FetchStrategyAdapter {
  readonly kind = FetchStrategyKind.FIRECRAWL;

  async fetchPage(request: FetchRequest): Promise<FetchResult> {
    const startedAt = Date.now();
    const target = assertSafeOutboundUrl(request.url, { allowPrivateHosts: false });
    const timeoutMs = request.timeoutMs ?? FETCH_DEFAULT_TIMEOUT_MS;
    const baseUrl = resolveStrategyBaseUrl(
      request.strategyConfig,
      SIDECAR_DEFAULT_BASE_URL[FetchStrategyKind.FIRECRAWL],
    );
    const reply = await postSidecarJson<FirecrawlScrapeResponse>(
      baseUrl,
      '/v2/scrape',
      {
        url: target.href,
        formats: ['rawHtml', 'markdown'],
        onlyMainContent: false,
        timeout: timeoutMs,
      },
      timeoutMs,
    );
    const data = reply.data;
    if (reply.success !== true || data === undefined) {
      throw new Error(`Firecrawl failed: ${reply.error ?? 'no data'}`);
    }
    return buildSidecarResult({
      requestedUrl: request.url,
      finalUrl: data.metadata?.url ?? data.metadata?.sourceURL ?? target.href,
      httpStatus: data.metadata?.statusCode ?? 200,
      html: data.rawHtml ?? null,
      markdown: data.markdown ?? null,
      title: data.metadata?.title ?? null,
      startedAt,
    });
  }
}
