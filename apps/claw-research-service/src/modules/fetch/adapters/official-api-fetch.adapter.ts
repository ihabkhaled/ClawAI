import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import {
  FETCH_DEFAULT_TIMEOUT_MS,
  FETCH_MAX_CONTENT_LENGTH,
  FETCH_MAX_LINKS,
  FETCH_MAX_REDIRECTS,
  RESEARCH_BOT_USER_AGENT,
} from '../../../common/constants/fetch.constants';
import { FetchStrategyKind } from '../../../generated/prisma';
import { OFFICIAL_API_MAX_BYTES } from '../constants/official-api.constants';
import { readLimitedBody } from '../utilities/limited-body.utility';
import { formatOfficialApiDocument } from '../utilities/official-api-format.utility';
import { resolveOfficialApiTarget } from '../utilities/official-api-resolver.utility';
import { followRedirectsSafely } from '../utilities/safe-redirect.utility';
import type { FetchStrategyAdapter } from './fetch-strategy-adapter.interface';
import type { FetchRequest, FetchResult } from '../types/fetch.types';

/**
 * Tier 0 (ADR-121): read a page through the site's own public API instead of
 * scraping its HTML — Wikipedia REST, the GitHub README API, arXiv's export
 * API, Crossref for DOIs, and the Hacker News Firebase API. `supports` is
 * false for every other URL, so this strategy costs nothing elsewhere.
 *
 * Only a 2xx answer is a result. Anything else throws, so the chain moves
 * on to the plain fetch rather than treating "the API had no README" as
 * "the page does not exist".
 */
@Injectable()
export class OfficialApiFetchAdapter implements FetchStrategyAdapter {
  readonly kind = FetchStrategyKind.OFFICIAL_API;
  private readonly logger = new Logger(OfficialApiFetchAdapter.name);

  supports(url: string): boolean {
    return resolveOfficialApiTarget(url) !== null;
  }

  async fetchPage(request: FetchRequest): Promise<FetchResult> {
    const startedAt = Date.now();
    const target = resolveOfficialApiTarget(request.url);
    if (target === null) {
      throw new Error(`No official API for ${request.url}`);
    }
    const signal = AbortSignal.timeout(request.timeoutMs ?? FETCH_DEFAULT_TIMEOUT_MS);
    const { response } = await followRedirectsSafely(
      target.apiUrl,
      async (url) => {
        const hop = await fetch(url, {
          redirect: 'manual',
          signal,
          headers: { 'User-Agent': RESEARCH_BOT_USER_AGENT, Accept: target.accept },
        });
        return { status: hop.status, location: hop.headers.get('location'), response: hop };
      },
      { maxRedirects: FETCH_MAX_REDIRECTS, allowlist: AppConfig.get().RESEARCH_DOMAIN_ALLOWLIST },
    );
    if (!response.ok) {
      throw new Error(`${target.source} API answered HTTP ${String(response.status)}`);
    }
    const bytes = await readLimitedBody(response.body, OFFICIAL_API_MAX_BYTES);
    const document = formatOfficialApiDocument(target, bytes.toString('utf8'), request.url);
    this.logger.debug(`${target.source} API served ${target.label}`);
    return {
      url: request.url,
      finalUrl: request.url,
      httpStatus: response.status,
      mimeType: 'text/markdown',
      title: document.title,
      content: document.content.slice(0, FETCH_MAX_CONTENT_LENGTH),
      links: document.links.slice(0, FETCH_MAX_LINKS),
      byteSize: bytes.length,
      cacheHit: false,
      latencyMs: Date.now() - startedAt,
    };
  }
}
