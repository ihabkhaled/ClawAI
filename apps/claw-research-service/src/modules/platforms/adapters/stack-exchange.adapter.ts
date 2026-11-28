import { Injectable } from '@nestjs/common';

import { PlatformApiKind } from '../../../generated/prisma';
import {
  PLATFORM_ACCEPT_JSON,
  STACK_EXCHANGE_SEARCH_URL,
  STACK_EXCHANGE_SITE,
} from '../constants/platform-api.constants';
import { toKeywordQuery } from '../utilities/keyword-query.utility';
import { platformApiGet } from '../utilities/platform-http.utility';
import {
  httpUrlOrNull,
  isoFromUnixSeconds,
  joinParts,
  parsePlatformJson,
  plainTextOf,
} from '../utilities/platform-text.utility';
import type { PlatformApiAdapter } from './platform-api-adapter.interface';
import type { StackExchangeSearchResponse } from '../types/platform-api-responses.types';
import type {
  PlatformApiContext,
  PlatformApiHit,
  PlatformApiRequest,
} from '../types/platform.types';

/** Stack Overflow questions through the Stack Exchange API (no key: shared daily quota). */
@Injectable()
export class StackExchangeAdapter implements PlatformApiAdapter {
  readonly kind = PlatformApiKind.STACK_EXCHANGE;

  async search(
    request: PlatformApiRequest,
    context: PlatformApiContext,
  ): Promise<PlatformApiHit[]> {
    const params = new URLSearchParams({
      order: 'desc',
      sort: 'relevance',
      q: toKeywordQuery(request.query),
      site: STACK_EXCHANGE_SITE,
      pagesize: String(request.maxResults),
    });
    const body = await platformApiGet(`${STACK_EXCHANGE_SEARCH_URL}?${params.toString()}`, {
      label: this.kind,
      accept: PLATFORM_ACCEPT_JSON,
      signal: context.signal,
      onNetworkCall: context.onNetworkCall,
    });
    return this.parse(body, request.maxResults);
  }

  /** Question link; tags · score · answers as the snippet (the default filter has no body). */
  parse(body: string, maxResults: number): PlatformApiHit[] {
    const items = parsePlatformJson<StackExchangeSearchResponse | null>(body, this.kind)?.items;
    if (!Array.isArray(items)) {
      return [];
    }
    return items.slice(0, maxResults).flatMap((item): PlatformApiHit[] => {
      const title = plainTextOf(item.title);
      const url = httpUrlOrNull(item.link);
      if (title === null || url === null) {
        return [];
      }
      const tags = Array.isArray(item.tags)
        ? item.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 5)
        : [];
      return [
        {
          title,
          url,
          snippet: joinParts([
            tags.length > 0 ? `Tags: ${tags.join(', ')}` : null,
            typeof item.score === 'number' ? `score ${String(item.score)}` : null,
            typeof item.answer_count === 'number' ? `${String(item.answer_count)} answers` : null,
            item.is_answered === true ? 'answered' : null,
          ]),
          publishedAt: isoFromUnixSeconds(item.creation_date),
        },
      ];
    });
  }
}
