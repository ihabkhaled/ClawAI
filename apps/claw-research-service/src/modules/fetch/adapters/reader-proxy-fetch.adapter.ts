import { Injectable } from '@nestjs/common';
import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';

import {
  FETCH_DEFAULT_TIMEOUT_MS,
  FETCH_MAX_BYTES,
  FETCH_MAX_CONTENT_LENGTH,
  RESEARCH_BOT_USER_AGENT,
} from '../../../common/constants/fetch.constants';
import { FetchStrategyKind } from '../../../generated/prisma';
import {
  READER_PROXY_MIN_INTERVAL_MS,
  READER_PROXY_RATE_LIMIT_KEY,
  SIDECAR_DEFAULT_BASE_URL,
} from '../constants/fetch-strategy.constants';
import { HostRateLimiter } from '../utilities/host-rate-limiter.utility';
import { readLimitedBody } from '../utilities/limited-body.utility';
import { assertPublicThirdPartyUrl } from '../utilities/public-url.utility';
import {
  readReaderTargetStatus,
  readReaderTitle,
} from '../utilities/reader-proxy-response.utility';
import { resolveStrategyBaseUrl } from '../utilities/strategy-config.utility';
import type { FetchStrategyAdapter } from './fetch-strategy-adapter.interface';
import type { FetchRequest, FetchResult } from '../types/fetch.types';

/**
 * Late fallback (ADR-121): Jina AI Reader (`r.jina.ai/<url>`) renders the
 * page on ITS servers and returns Markdown. Because the URL leaves this
 * deployment, only public URLs go — never a private or allowlisted-internal
 * host, never a URL carrying a token, never a signed-in-only app
 * (`assertPublicThirdPartyUrl`). The keyless tier is rate-limited, so every
 * call from this process waits its turn (`READER_PROXY_MIN_INTERVAL_MS`).
 *
 * `publicConfig.baseUrl` can point it at a self-hosted reader instead.
 */
@Injectable()
export class ReaderProxyFetchAdapter implements FetchStrategyAdapter {
  readonly kind = FetchStrategyKind.READER_PROXY;
  private readonly limiter = new HostRateLimiter(READER_PROXY_MIN_INTERVAL_MS);

  async fetchPage(request: FetchRequest): Promise<FetchResult> {
    const startedAt = Date.now();
    const target = assertPublicThirdPartyUrl(request.url);
    const baseUrl = resolveStrategyBaseUrl(
      request.strategyConfig,
      SIDECAR_DEFAULT_BASE_URL[FetchStrategyKind.READER_PROXY],
    );
    await this.limiter.waitForTurn(READER_PROXY_RATE_LIMIT_KEY);

    const readerUrl = `${baseUrl}${target.href}`;
    assertSafeRequestUrl(readerUrl, declaredHost(baseUrl));
    const response = await fetch(readerUrl, {
      redirect: 'error',
      signal: AbortSignal.timeout(request.timeoutMs ?? FETCH_DEFAULT_TIMEOUT_MS),
      headers: {
        'User-Agent': RESEARCH_BOT_USER_AGENT,
        Accept: 'text/plain',
        'X-Return-Format': 'markdown',
      },
    });
    if (!response.ok) {
      throw new Error(`Reader proxy answered HTTP ${String(response.status)} for ${target.href}`);
    }
    const bytes = await readLimitedBody(response.body, FETCH_MAX_BYTES);
    const text = bytes.toString('utf8');
    return {
      url: request.url,
      finalUrl: target.href,
      // The reader answers 200 and reports the target's own error in its
      // body; surface that status so the classifier sees the real outcome.
      httpStatus: readReaderTargetStatus(text),
      mimeType: 'text/markdown',
      title: readReaderTitle(text),
      content: text.slice(0, FETCH_MAX_CONTENT_LENGTH),
      links: [],
      byteSize: bytes.length,
      cacheHit: false,
      latencyMs: Date.now() - startedAt,
    };
  }
}
