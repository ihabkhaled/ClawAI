import { Injectable } from '@nestjs/common';

import { PlatformApiKind } from '../../../generated/prisma';
import {
  HN_ALGOLIA_SEARCH_URL,
  HN_ITEM_URL,
  HN_OBJECT_ID_PATTERN,
  PLATFORM_ACCEPT_JSON,
} from '../constants/platform-api.constants';
import { platformApiGet } from '../utilities/platform-http.utility';
import {
  httpUrlOrNull,
  joinParts,
  parsePlatformJson,
  plainTextOf,
  stringOrNull,
} from '../utilities/platform-text.utility';
import type { PlatformApiAdapter } from './platform-api-adapter.interface';
import type { HnAlgoliaSearchResponse } from '../types/platform-api-responses.types';
import type {
  PlatformApiContext,
  PlatformApiHit,
  PlatformApiRequest,
} from '../types/platform.types';

/**
 * Hacker News stories through Algolia's public HN search. The hit URL is the HN
 * discussion (the platform's own content; the fetch layer reads it through the
 * HN official API); the story's link goes into the snippet.
 */
@Injectable()
export class HnAlgoliaAdapter implements PlatformApiAdapter {
  readonly kind = PlatformApiKind.HN_ALGOLIA;

  async search(
    request: PlatformApiRequest,
    context: PlatformApiContext,
  ): Promise<PlatformApiHit[]> {
    const params = new URLSearchParams({
      query: request.query,
      hitsPerPage: String(request.maxResults),
      tags: 'story',
    });
    const body = await platformApiGet(`${HN_ALGOLIA_SEARCH_URL}?${params.toString()}`, {
      label: this.kind,
      accept: PLATFORM_ACCEPT_JSON,
      signal: context.signal,
      onNetworkCall: context.onNetworkCall,
    });
    return this.parse(body, request.maxResults);
  }

  parse(body: string, maxResults: number): PlatformApiHit[] {
    const hits = parsePlatformJson<HnAlgoliaSearchResponse | null>(body, this.kind)?.hits;
    if (!Array.isArray(hits)) {
      return [];
    }
    return hits.slice(0, maxResults).flatMap((hit): PlatformApiHit[] => {
      const title = plainTextOf(hit.title);
      const id = stringOrNull(hit.objectID);
      if (title === null || id === null || !HN_OBJECT_ID_PATTERN.test(id)) {
        return [];
      }
      const link = httpUrlOrNull(hit.url);
      return [
        {
          title,
          url: `${HN_ITEM_URL}${id}`,
          snippet:
            plainTextOf(hit.story_text) ??
            joinParts([
              link === null ? null : `Link: ${link}`,
              typeof hit.points === 'number' ? `${String(hit.points)} points` : null,
              typeof hit.num_comments === 'number' ? `${String(hit.num_comments)} comments` : null,
            ]),
          publishedAt: stringOrNull(hit.created_at),
        },
      ];
    });
  }
}
