import { Injectable } from '@nestjs/common';

import { FETCH_DEFAULT_TIMEOUT_MS } from '../../../common/constants/fetch.constants';
import { assertSafeOutboundUrl } from '../../../common/utilities/url-safety.utility';
import { FetchStrategyKind } from '../../../generated/prisma';
import { SIDECAR_DEFAULT_BASE_URL } from '../constants/fetch-strategy.constants';
import { buildSidecarResult, postSidecarJson } from '../utilities/sidecar-client.utility';
import { resolveStrategyBaseUrl } from '../utilities/strategy-config.utility';
import type { FetchStrategyAdapter } from './fetch-strategy-adapter.interface';
import type { FetchRequest, FetchResult } from '../types/fetch.types';
import type { FlareSolverrResponse } from '../types/sidecar.types';

/**
 * Sidecar (ADR-121, compose profile `flaresolverr`, seeded DISABLED):
 * FlareSolverr waits out a JavaScript interstitial ("Just a moment…") in a
 * real browser and returns the page behind it.
 *
 * Narrow by design, per the owner's decision: the escalation policy only
 * lets this run AFTER a JS_CHALLENGE signal was seen on this fetch, and only
 * for a URL robots.txt already allowed. It is for technical interstitials,
 * never for overriding an explicit refusal — a 401, a 451, a captcha or a
 * robots disallow never reaches it.
 */
@Injectable()
export class FlareSolverrFetchAdapter implements FetchStrategyAdapter {
  readonly kind = FetchStrategyKind.FLARESOLVERR;

  async fetchPage(request: FetchRequest): Promise<FetchResult> {
    const startedAt = Date.now();
    const target = assertSafeOutboundUrl(request.url, { allowPrivateHosts: false });
    const timeoutMs = request.timeoutMs ?? FETCH_DEFAULT_TIMEOUT_MS;
    const baseUrl = resolveStrategyBaseUrl(
      request.strategyConfig,
      SIDECAR_DEFAULT_BASE_URL[FetchStrategyKind.FLARESOLVERR],
    );
    const reply = await postSidecarJson<FlareSolverrResponse>(
      baseUrl,
      '/v1',
      { cmd: 'request.get', url: target.href, maxTimeout: timeoutMs },
      timeoutMs,
    );
    const solution = reply.solution;
    if (reply.status !== 'ok' || solution === undefined) {
      throw new Error(`FlareSolverr failed: ${reply.message ?? 'no solution'}`);
    }
    return buildSidecarResult({
      requestedUrl: request.url,
      finalUrl: solution.url ?? target.href,
      httpStatus: solution.status ?? 200,
      html: solution.response ?? null,
      markdown: null,
      title: null,
      startedAt,
    });
  }
}
