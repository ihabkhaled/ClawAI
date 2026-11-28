import { Injectable } from '@nestjs/common';

import { PlatformApiKind } from '../../../generated/prisma';
import {
  OPENALEX_SELECT_FIELDS,
  OPENALEX_WORKS_URL,
  PLATFORM_ACCEPT_JSON,
} from '../constants/platform-api.constants';
import { platformApiGet } from '../utilities/platform-http.utility';
import { abstractFromInvertedIndex } from '../utilities/platform-abstract.utility';
import {
  httpUrlOrNull,
  parsePlatformJson,
  plainTextOf,
  stringOrNull,
} from '../utilities/platform-text.utility';
import type { PlatformApiAdapter } from './platform-api-adapter.interface';
import type { OpenAlexWorksResponse } from '../types/platform-api-responses.types';
import type {
  PlatformApiContext,
  PlatformApiHit,
  PlatformApiRequest,
} from '../types/platform.types';

/** OpenAlex works search (`api.openalex.org/works?search=`). Free, no key. */
@Injectable()
export class OpenAlexAdapter implements PlatformApiAdapter {
  readonly kind = PlatformApiKind.OPENALEX;

  async search(
    request: PlatformApiRequest,
    context: PlatformApiContext,
  ): Promise<PlatformApiHit[]> {
    const params = new URLSearchParams({
      search: request.query,
      'per-page': String(request.maxResults),
      select: OPENALEX_SELECT_FIELDS,
    });
    const body = await platformApiGet(`${OPENALEX_WORKS_URL}?${params.toString()}`, {
      label: this.kind,
      accept: PLATFORM_ACCEPT_JSON,
      signal: context.signal,
      onNetworkCall: context.onNetworkCall,
    });
    return this.parse(body, request.maxResults);
  }

  /** Landing page, else DOI link, else the OpenAlex record; abstract rebuilt from its inverted index. */
  parse(body: string, maxResults: number): PlatformApiHit[] {
    const works = parsePlatformJson<OpenAlexWorksResponse | null>(body, this.kind)?.results;
    if (!Array.isArray(works)) {
      return [];
    }
    return works.slice(0, maxResults).flatMap((work): PlatformApiHit[] => {
      const title = plainTextOf(work.display_name);
      const url =
        httpUrlOrNull(work.primary_location?.landing_page_url) ??
        httpUrlOrNull(work.doi) ??
        httpUrlOrNull(work.id);
      if (title === null || url === null) {
        return [];
      }
      return [
        {
          title,
          url,
          snippet: plainTextOf(abstractFromInvertedIndex(work.abstract_inverted_index)),
          publishedAt: stringOrNull(work.publication_date),
        },
      ];
    });
  }
}
