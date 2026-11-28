import { Injectable } from '@nestjs/common';

import { PlatformApiKind } from '../../../generated/prisma';
import {
  PLATFORM_ACCEPT_JSON,
  SEMANTIC_SCHOLAR_FIELDS,
  SEMANTIC_SCHOLAR_PAPER_URL,
  SEMANTIC_SCHOLAR_SEARCH_URL,
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
import type { SemanticScholarSearchResponse } from '../types/platform-api-responses.types';
import type {
  PlatformApiContext,
  PlatformApiHit,
  PlatformApiRequest,
} from '../types/platform.types';

/** Semantic Scholar paper search (Graph API), unauthenticated (shared rate limit). */
@Injectable()
export class SemanticScholarAdapter implements PlatformApiAdapter {
  readonly kind = PlatformApiKind.SEMANTIC_SCHOLAR;

  async search(
    request: PlatformApiRequest,
    context: PlatformApiContext,
  ): Promise<PlatformApiHit[]> {
    const params = new URLSearchParams({
      query: request.query,
      limit: String(request.maxResults),
      fields: SEMANTIC_SCHOLAR_FIELDS,
    });
    const body = await platformApiGet(`${SEMANTIC_SCHOLAR_SEARCH_URL}?${params.toString()}`, {
      label: this.kind,
      accept: PLATFORM_ACCEPT_JSON,
      signal: context.signal,
      onNetworkCall: context.onNetworkCall,
    });
    return this.parse(body, request.maxResults);
  }

  /** The paper page (API `url`, else built from the id); abstract, else venue · year. */
  parse(body: string, maxResults: number): PlatformApiHit[] {
    const papers = parsePlatformJson<SemanticScholarSearchResponse | null>(body, this.kind)?.data;
    if (!Array.isArray(papers)) {
      return [];
    }
    return papers.slice(0, maxResults).flatMap((paper): PlatformApiHit[] => {
      const title = plainTextOf(paper.title);
      const id = stringOrNull(paper.paperId);
      const url =
        httpUrlOrNull(paper.url) ??
        (id !== null && /^[\da-f]{40}$/u.test(id) ? `${SEMANTIC_SCHOLAR_PAPER_URL}${id}` : null);
      if (title === null || url === null) {
        return [];
      }
      const year =
        typeof paper.year === 'number' && Number.isInteger(paper.year) ? paper.year : null;
      return [
        {
          title,
          url,
          snippet:
            plainTextOf(paper.abstract) ??
            joinParts([stringOrNull(paper.venue), year === null ? null : String(year)]),
          publishedAt: year === null ? null : String(year),
        },
      ];
    });
  }
}
