import { Injectable } from '@nestjs/common';

import { PlatformApiKind } from '../../../generated/prisma';
import {
  PLATFORM_ACCEPT_JSON,
  PUBMED_ARTICLE_URL,
  PUBMED_ESEARCH_URL,
  PUBMED_ESUMMARY_URL,
  PUBMED_ID_PATTERN,
} from '../constants/platform-api.constants';
import { platformApiGet } from '../utilities/platform-http.utility';
import {
  joinParts,
  parsePlatformJson,
  plainTextOf,
  stringOrNull,
} from '../utilities/platform-text.utility';
import type { PlatformApiAdapter } from './platform-api-adapter.interface';
import type {
  PubMedSearchResponse,
  PubMedSummaryDocument,
  PubMedSummaryResponse,
} from '../types/platform-api-responses.types';
import type {
  PlatformApiContext,
  PlatformApiHit,
  PlatformApiRequest,
} from '../types/platform.types';

/**
 * PubMed through NCBI E-utilities: `esearch` for ids, then `esummary` for their
 * titles (two calls, two metered units; no second call when nothing matched).
 * No API key, no `email`/`tool` parameter: nothing identifying is sent.
 */
@Injectable()
export class PubMedAdapter implements PlatformApiAdapter {
  readonly kind = PlatformApiKind.PUBMED;

  async search(
    request: PlatformApiRequest,
    context: PlatformApiContext,
  ): Promise<PlatformApiHit[]> {
    const options = {
      label: this.kind,
      accept: PLATFORM_ACCEPT_JSON,
      signal: context.signal,
      onNetworkCall: context.onNetworkCall,
    };
    const searchParams = new URLSearchParams({
      db: 'pubmed',
      retmode: 'json',
      retmax: String(request.maxResults),
      term: request.query,
    });
    const ids = this.parseIds(
      await platformApiGet(`${PUBMED_ESEARCH_URL}?${searchParams.toString()}`, options),
      request.maxResults,
    );
    if (ids.length === 0) {
      return [];
    }
    const summaryParams = new URLSearchParams({ db: 'pubmed', retmode: 'json', id: ids.join(',') });
    const body = await platformApiGet(
      `${PUBMED_ESUMMARY_URL}?${summaryParams.toString()}`,
      options,
    );
    return this.parse(body, request.maxResults);
  }

  /** PubMed ids from an esearch body: digits only, at most `maxResults`. */
  parseIds(body: string, maxResults: number): string[] {
    const list = parsePlatformJson<PubMedSearchResponse | null>(body, this.kind)?.esearchresult
      ?.idlist;
    return Array.isArray(list)
      ? list
          .filter((id): id is string => typeof id === 'string' && PUBMED_ID_PATTERN.test(id))
          .slice(0, maxResults)
      : [];
  }

  /** Hits from an esummary body, in `result.uids` order; journal · date · first authors as snippet. */
  parse(body: string, maxResults: number): PlatformApiHit[] {
    const result = parsePlatformJson<PubMedSummaryResponse | null>(body, this.kind)?.result;
    if (typeof result !== 'object' || result === null) {
      return [];
    }
    const documents = new Map(Object.entries(result));
    const uids = documents.get('uids');
    if (!Array.isArray(uids)) {
      return [];
    }
    return uids.slice(0, maxResults).flatMap((uid): PlatformApiHit[] => {
      const document = typeof uid === 'string' ? documents.get(uid) : undefined;
      if (typeof uid !== 'string' || !PUBMED_ID_PATTERN.test(uid) || !this.isDocument(document)) {
        return [];
      }
      const title = plainTextOf(document.title);
      return title === null ? [] : [this.toHit(uid, title, document)];
    });
  }

  private toHit(uid: string, title: string, document: PubMedSummaryDocument): PlatformApiHit {
    const authors = Array.isArray(document.authors)
      ? document.authors
          .slice(0, 3)
          .flatMap((author) => (typeof author.name === 'string' ? [author.name] : []))
      : [];
    const sortDate = stringOrNull(document.sortpubdate);
    return {
      title,
      url: `${PUBMED_ARTICLE_URL}${uid}/`,
      snippet: joinParts([
        stringOrNull(document.fulljournalname) ?? stringOrNull(document.source),
        stringOrNull(document.pubdate),
        authors.length > 0 ? authors.join(', ') : null,
      ]),
      publishedAt:
        sortDate !== null && /^\d{4}\/\d{2}\/\d{2}/u.test(sortDate)
          ? sortDate.slice(0, 10).replaceAll('/', '-')
          : null,
    };
  }

  private isDocument(value: unknown): value is PubMedSummaryDocument {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
