import { Injectable } from '@nestjs/common';

import { ArchiveSnapshotFetchAdapter } from '../adapters/archive-snapshot-fetch.adapter';
import { Crawl4AiFetchAdapter } from '../adapters/crawl4ai-fetch.adapter';
import { FirecrawlFetchAdapter } from '../adapters/firecrawl-fetch.adapter';
import { FlareSolverrFetchAdapter } from '../adapters/flaresolverr-fetch.adapter';
import { HeadlessFetchAdapter } from '../adapters/headless-fetch.adapter';
import { HttpFetchAdapter } from '../adapters/http-fetch.adapter';
import { OfficialApiFetchAdapter } from '../adapters/official-api-fetch.adapter';
import { ReaderProxyFetchAdapter } from '../adapters/reader-proxy-fetch.adapter';
import { TlsImpersonateFetchAdapter } from '../adapters/tls-impersonate-fetch.adapter';
import type { FetchStrategyKind } from '../../../generated/prisma';
import type { FetchStrategyAdapter } from '../adapters/fetch-strategy-adapter.interface';

/**
 * `kind -> adapter` lookup for every strategy adapter Nest constructs. Each
 * adapter declares its own `kind`, so the map is built from the list — adding
 * a strategy is one constructor parameter here plus a `FetchModule` provider.
 * See `skills/add-a-fetch-strategy.md`.
 */
@Injectable()
export class FetchStrategyRegistryService {
  private readonly adaptersByKind: ReadonlyMap<FetchStrategyKind, FetchStrategyAdapter>;

  constructor(
    officialApi: OfficialApiFetchAdapter,
    httpPlain: HttpFetchAdapter,
    tlsImpersonate: TlsImpersonateFetchAdapter,
    headless: HeadlessFetchAdapter,
    crawl4ai: Crawl4AiFetchAdapter,
    flareSolverr: FlareSolverrFetchAdapter,
    firecrawl: FirecrawlFetchAdapter,
    readerProxy: ReaderProxyFetchAdapter,
    archiveSnapshot: ArchiveSnapshotFetchAdapter,
  ) {
    const adapters: FetchStrategyAdapter[] = [
      officialApi,
      httpPlain,
      tlsImpersonate,
      headless,
      crawl4ai,
      flareSolverr,
      firecrawl,
      readerProxy,
      archiveSnapshot,
    ];
    this.adaptersByKind = new Map(adapters.map((adapter) => [adapter.kind, adapter]));
  }

  get(kind: FetchStrategyKind): FetchStrategyAdapter | undefined {
    return this.adaptersByKind.get(kind);
  }
}
