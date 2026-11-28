import { Injectable } from '@nestjs/common';

import { PlatformApiKind } from '../../../generated/prisma';
import { GITHUB_ACCEPT, GITHUB_REPO_SEARCH_URL } from '../constants/platform-api.constants';
import { toKeywordQuery } from '../utilities/keyword-query.utility';
import { platformApiGet } from '../utilities/platform-http.utility';
import {
  httpUrlOrNull,
  joinParts,
  parsePlatformJson,
  plainTextOf,
  stringOrNull,
} from '../utilities/platform-text.utility';
import type { PlatformApiAdapter } from './platform-api-adapter.interface';
import type { GithubRepoSearchResponse } from '../types/platform-api-responses.types';
import type {
  PlatformApiContext,
  PlatformApiHit,
  PlatformApiRequest,
} from '../types/platform.types';

/**
 * GitHub repository search, unauthenticated (10 requests/minute per IP). The
 * required `User-Agent` is the research bot's (set by `platformApiGet`).
 */
@Injectable()
export class GithubAdapter implements PlatformApiAdapter {
  readonly kind = PlatformApiKind.GITHUB;

  async search(
    request: PlatformApiRequest,
    context: PlatformApiContext,
  ): Promise<PlatformApiHit[]> {
    const params = new URLSearchParams({
      q: toKeywordQuery(request.query),
      per_page: String(request.maxResults),
    });
    const body = await platformApiGet(`${GITHUB_REPO_SEARCH_URL}?${params.toString()}`, {
      label: this.kind,
      accept: GITHUB_ACCEPT,
      signal: context.signal,
      onNetworkCall: context.onNetworkCall,
    });
    return this.parse(body, request.maxResults);
  }

  /** Repo page; description · stars · language · last push as the snippet; created date. */
  parse(body: string, maxResults: number): PlatformApiHit[] {
    const items = parsePlatformJson<GithubRepoSearchResponse | null>(body, this.kind)?.items;
    if (!Array.isArray(items)) {
      return [];
    }
    return items.slice(0, maxResults).flatMap((item): PlatformApiHit[] => {
      const title = plainTextOf(item.full_name);
      const url = httpUrlOrNull(item.html_url);
      if (title === null || url === null) {
        return [];
      }
      const pushed = stringOrNull(item.pushed_at);
      return [
        {
          title,
          url,
          snippet: joinParts([
            plainTextOf(item.description),
            typeof item.stargazers_count === 'number'
              ? `${String(item.stargazers_count)} stars`
              : null,
            stringOrNull(item.language),
            pushed === null ? null : `last push ${pushed.slice(0, 10)}`,
          ]),
          publishedAt: stringOrNull(item.created_at),
        },
      ];
    });
  }
}
