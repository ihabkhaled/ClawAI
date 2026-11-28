import { Injectable } from '@nestjs/common';

import { PlatformApiKind } from '../../../generated/prisma';
import { ARXIV_QUERY_URL, PLATFORM_ACCEPT_ATOM } from '../constants/platform-api.constants';
import { parseArxivAtom } from '../utilities/arxiv-atom.utility';
import { platformApiGet } from '../utilities/platform-http.utility';
import type { PlatformApiAdapter } from './platform-api-adapter.interface';
import type {
  PlatformApiContext,
  PlatformApiHit,
  PlatformApiRequest,
} from '../types/platform.types';

/**
 * arXiv export API (`search_query=all:<terms>`), Atom parsed linearly. Query
 * syntax characters are dropped from the terms so a user's text can never
 * become an arXiv operator.
 */
@Injectable()
export class ArxivAdapter implements PlatformApiAdapter {
  readonly kind = PlatformApiKind.ARXIV;

  async search(
    request: PlatformApiRequest,
    context: PlatformApiContext,
  ): Promise<PlatformApiHit[]> {
    const terms = request.query
      .replaceAll(/[^\p{L}\p{N}\s-]+/gu, ' ')
      .replaceAll(/\s+/gu, ' ')
      .trim();
    if (terms.length === 0) {
      return [];
    }
    const params = new URLSearchParams({
      search_query: `all:${terms}`,
      max_results: String(request.maxResults),
    });
    const body = await platformApiGet(`${ARXIV_QUERY_URL}?${params.toString()}`, {
      label: this.kind,
      accept: PLATFORM_ACCEPT_ATOM,
      signal: context.signal,
      onNetworkCall: context.onNetworkCall,
    });
    return this.parse(body, request.maxResults);
  }

  parse(body: string, maxResults: number): PlatformApiHit[] {
    return parseArxivAtom(body, maxResults);
  }
}
