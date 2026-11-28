import { Injectable } from '@nestjs/common';

import {
  PLATFORM_DEFAULT_WIKIPEDIA_LANGUAGE,
  RESEARCH_LANGUAGE_CODE_PATTERN,
} from '../../../common/constants/research-engine.constants';
import { PlatformApiKind } from '../../../generated/prisma';
import {
  PLATFORM_ACCEPT_JSON,
  WIKIPEDIA_API_PATH,
  WIKIPEDIA_ARTICLE_PATH,
} from '../constants/platform-api.constants';
import { PlatformHostRefusedError } from '../errors/platform-host-refused.error';
import { platformApiGet } from '../utilities/platform-http.utility';
import { parsePlatformJson, plainTextOf } from '../utilities/platform-text.utility';
import type { PlatformApiAdapter } from './platform-api-adapter.interface';
import type { WikipediaSearchResponse } from '../types/platform-api-responses.types';
import type {
  PlatformApiContext,
  PlatformApiHit,
  PlatformApiRequest,
} from '../types/platform.types';

/**
 * Wikipedia full-text search on one language edition (MediaWiki action API).
 * The language must match `/^[a-z]{2,3}$/` before it becomes a host name; any
 * other value is refused without a request.
 */
@Injectable()
export class WikipediaAdapter implements PlatformApiAdapter {
  readonly kind = PlatformApiKind.WIKIPEDIA;

  async search(
    request: PlatformApiRequest,
    context: PlatformApiContext,
  ): Promise<PlatformApiHit[]> {
    const language = request.language ?? PLATFORM_DEFAULT_WIKIPEDIA_LANGUAGE;
    if (!RESEARCH_LANGUAGE_CODE_PATTERN.test(language)) {
      throw new PlatformHostRefusedError(`${language}.wikipedia.org`);
    }
    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      format: 'json',
      utf8: '1',
      srlimit: String(request.maxResults),
      srsearch: request.query,
    });
    const body = await platformApiGet(
      `https://${language}.wikipedia.org${WIKIPEDIA_API_PATH}?${params.toString()}`,
      {
        label: this.kind,
        accept: PLATFORM_ACCEPT_JSON,
        signal: context.signal,
        onNetworkCall: context.onNetworkCall,
      },
    );
    return this.parse(body, request.maxResults, language);
  }

  /** Article URL on the same edition; the `searchmatch` snippet stripped of markup. */
  parse(
    body: string,
    maxResults: number,
    language: string = PLATFORM_DEFAULT_WIKIPEDIA_LANGUAGE,
  ): PlatformApiHit[] {
    const pages = parsePlatformJson<WikipediaSearchResponse | null>(body, this.kind)?.query?.search;
    if (!Array.isArray(pages) || !RESEARCH_LANGUAGE_CODE_PATTERN.test(language)) {
      return [];
    }
    return pages.slice(0, maxResults).flatMap((page): PlatformApiHit[] => {
      const title = typeof page.title === 'string' ? page.title.trim() : '';
      if (title.length === 0 || title.length > 300) {
        return [];
      }
      return [
        {
          title,
          url: `https://${language}.wikipedia.org${WIKIPEDIA_ARTICLE_PATH}${encodeURIComponent(title.replaceAll(' ', '_'))}`,
          snippet: plainTextOf(page.snippet),
          publishedAt: null,
        },
      ];
    });
  }
}
