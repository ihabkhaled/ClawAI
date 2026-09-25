import { Injectable } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import {
  FETCH_DEFAULT_TIMEOUT_MS,
  FETCH_MAX_BYTES,
  FETCH_MAX_REDIRECTS,
} from '../../../common/constants/fetch.constants';
import { ImpersonatingHttpClient } from '../../../common/utilities/impit-client.utility';
import { FetchStrategyKind } from '../../../generated/prisma';
import { TLS_IMPERSONATE_BROWSER } from '../constants/fetch-strategy.constants';
import { parseMimeType, readLimitedBody } from '../utilities/limited-body.utility';
import { buildResultFromRawBody } from '../utilities/raw-body-result.utility';
import { followRedirectsSafely } from '../utilities/safe-redirect.utility';
import type { FetchStrategyAdapter } from './fetch-strategy-adapter.interface';
import type { FetchRequest, FetchResult } from '../types/fetch.types';

/**
 * Tier 2 (ADR-121): the same GET as `HttpFetchAdapter`, sent through `impit`
 * so the TLS ClientHello and HTTP/2 fingerprint are Chrome's rather than
 * Node's. That is the whole difference — and it is the difference for a
 * site whose WAF 403s every client that does not look like a browser on the
 * wire (fiverr.com 403s Node's fetch even with a Chrome User-Agent, and
 * serves impit 200; checked 2026-09-25).
 *
 * impit sends Chrome's own headers, User-Agent included. robots.txt was
 * already checked against the `ClawAI-ResearchBot` token before any tier
 * ran, so impersonating on the wire never widens what we may fetch.
 */
@Injectable()
export class TlsImpersonateFetchAdapter implements FetchStrategyAdapter {
  readonly kind = FetchStrategyKind.HTTP_TLS_IMPERSONATE;
  private readonly client = new ImpersonatingHttpClient(TLS_IMPERSONATE_BROWSER);

  async fetchPage(request: FetchRequest): Promise<FetchResult> {
    const startedAt = Date.now();
    const timeoutMs = request.timeoutMs ?? FETCH_DEFAULT_TIMEOUT_MS;
    const { response, finalUrl } = await followRedirectsSafely(
      request.url,
      async (url) => {
        const exchange = await this.client.get(url, timeoutMs);
        return { status: exchange.status, location: exchange.location, response: exchange };
      },
      { maxRedirects: FETCH_MAX_REDIRECTS, allowlist: AppConfig.get().RESEARCH_DOMAIN_ALLOWLIST },
    );

    const bytes = await readLimitedBody(response.body, FETCH_MAX_BYTES);
    return buildResultFromRawBody({
      url: request.url,
      finalUrl,
      httpStatus: response.status,
      mimeType: parseMimeType(response.contentType),
      body: response.decode(bytes),
      byteSize: bytes.length,
      startedAt,
    });
  }
}
