import { Injectable } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import {
  FETCH_DEFAULT_TIMEOUT_MS,
  FETCH_MAX_BYTES,
  FETCH_MAX_REDIRECTS,
  RESEARCH_BOT_USER_AGENT,
} from '../../../common/constants/fetch.constants';
import { FetchStrategyKind } from '../../../generated/prisma';
import { readLimitedBody, parseMimeType } from '../utilities/limited-body.utility';
import { buildResultFromRawBody } from '../utilities/raw-body-result.utility';
import { followRedirectsSafely } from '../utilities/safe-redirect.utility';
import type { FetchStrategyAdapter } from './fetch-strategy-adapter.interface';
import type { FetchRequest, FetchResult } from '../types/fetch.types';

/**
 * Tier 1 of the escalation chain (ADR-121): a plain GET with Node's own
 * `fetch`, identifying honestly as `ClawAI-ResearchBot`.
 *
 * Private hosts are permitted ONLY when the operator named them in
 * `RESEARCH_DOMAIN_ALLOWLIST` (see the SSRF history in the research service
 * guide). Redirects are followed by `followRedirectsSafely`, which checks
 * every hop BEFORE requesting it — `redirect: 'follow'` would have connected
 * to a `302 → 169.254.169.254` target before anyone could refuse it.
 */
@Injectable()
export class HttpFetchAdapter implements FetchStrategyAdapter {
  readonly kind = FetchStrategyKind.HTTP_PLAIN;

  async fetchPage(request: FetchRequest): Promise<FetchResult> {
    const startedAt = Date.now();
    const timeoutMs = request.timeoutMs ?? FETCH_DEFAULT_TIMEOUT_MS;
    const signal = AbortSignal.timeout(timeoutMs);
    const { response, finalUrl } = await followRedirectsSafely(
      request.url,
      async (url) => {
        const hop = await fetch(url, {
          redirect: 'manual',
          signal,
          headers: {
            'User-Agent': RESEARCH_BOT_USER_AGENT,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        return { status: hop.status, location: hop.headers.get('location'), response: hop };
      },
      { maxRedirects: FETCH_MAX_REDIRECTS, allowlist: AppConfig.get().RESEARCH_DOMAIN_ALLOWLIST },
    );

    const mimeType = parseMimeType(response.headers.get('content-type'));
    const bytes = await readLimitedBody(response.body, FETCH_MAX_BYTES);
    return buildResultFromRawBody({
      url: request.url,
      finalUrl,
      httpStatus: response.status,
      mimeType,
      body: bytes.toString('utf8'),
      byteSize: bytes.length,
      startedAt,
    });
  }
}
