import { Injectable } from '@nestjs/common';

import { PlatformApiKind } from '../../../generated/prisma';
import {
  CROSSREF_SELECT_FIELDS,
  CROSSREF_WORKS_URL,
  PLATFORM_ACCEPT_JSON,
} from '../constants/platform-api.constants';
import { platformApiGet } from '../utilities/platform-http.utility';
import {
  httpUrlOrNull,
  isoDateFromParts,
  joinParts,
  parsePlatformJson,
  plainTextOf,
  stringOrNull,
} from '../utilities/platform-text.utility';
import type { PlatformApiAdapter } from './platform-api-adapter.interface';
import type { CrossrefWorksResponse } from '../types/platform-api-responses.types';
import type {
  PlatformApiContext,
  PlatformApiHit,
  PlatformApiRequest,
} from '../types/platform.types';

/** Crossref works search (`api.crossref.org/works?query=`). No key, no `mailto`. */
@Injectable()
export class CrossrefAdapter implements PlatformApiAdapter {
  readonly kind = PlatformApiKind.CROSSREF;

  async search(
    request: PlatformApiRequest,
    context: PlatformApiContext,
  ): Promise<PlatformApiHit[]> {
    const params = new URLSearchParams({
      query: request.query,
      rows: String(request.maxResults),
      select: CROSSREF_SELECT_FIELDS,
    });
    const body = await platformApiGet(`${CROSSREF_WORKS_URL}?${params.toString()}`, {
      label: this.kind,
      accept: PLATFORM_ACCEPT_JSON,
      signal: context.signal,
      onNetworkCall: context.onNetworkCall,
    });
    return this.parse(body, request.maxResults);
  }

  /** The DOI link; JATS abstract stripped, else the journal title. */
  parse(body: string, maxResults: number): PlatformApiHit[] {
    const items = parsePlatformJson<CrossrefWorksResponse | null>(body, this.kind)?.message?.items;
    if (!Array.isArray(items)) {
      return [];
    }
    return items.slice(0, maxResults).flatMap((item): PlatformApiHit[] => {
      const title = plainTextOf(this.first(item.title));
      const doi = stringOrNull(item.DOI);
      const url =
        httpUrlOrNull(item.URL) ?? (doi === null ? null : httpUrlOrNull(`https://doi.org/${doi}`));
      if (title === null || url === null) {
        return [];
      }
      const parts = item.published?.['date-parts'];
      const firstParts = Array.isArray(parts) && Array.isArray(parts[0]) ? parts[0] : undefined;
      return [
        {
          title,
          url,
          snippet:
            plainTextOf(item.abstract) ??
            joinParts([plainTextOf(this.first(item['container-title']))]),
          publishedAt: isoDateFromParts(
            firstParts?.filter((part): part is number => typeof part === 'number'),
          ),
        },
      ];
    });
  }

  /** Crossref titles are arrays; the first string or null. */
  private first(value: unknown): unknown {
    return Array.isArray(value) ? value[0] : value;
  }
}
