import { FetchStrategyKind } from '../../../../generated/prisma';
import { FetchStrategyRegistryService } from '../fetch-strategy-registry.service';
import type { ArchiveSnapshotFetchAdapter } from '../../adapters/archive-snapshot-fetch.adapter';
import type { Crawl4AiFetchAdapter } from '../../adapters/crawl4ai-fetch.adapter';
import type { FirecrawlFetchAdapter } from '../../adapters/firecrawl-fetch.adapter';
import type { FlareSolverrFetchAdapter } from '../../adapters/flaresolverr-fetch.adapter';
import type { HeadlessFetchAdapter } from '../../adapters/headless-fetch.adapter';
import type { HttpFetchAdapter } from '../../adapters/http-fetch.adapter';
import type { OfficialApiFetchAdapter } from '../../adapters/official-api-fetch.adapter';
import type { ReaderProxyFetchAdapter } from '../../adapters/reader-proxy-fetch.adapter';
import type { TlsImpersonateFetchAdapter } from '../../adapters/tls-impersonate-fetch.adapter';

describe('FetchStrategyRegistryService', () => {
  it('resolves every FetchStrategyKind to the adapter that declares it', () => {
    const fake = <T>(kind: FetchStrategyKind): T => ({ kind }) as unknown as T;
    const registry = new FetchStrategyRegistryService(
      fake<OfficialApiFetchAdapter>(FetchStrategyKind.OFFICIAL_API),
      fake<HttpFetchAdapter>(FetchStrategyKind.HTTP_PLAIN),
      fake<TlsImpersonateFetchAdapter>(FetchStrategyKind.HTTP_TLS_IMPERSONATE),
      fake<HeadlessFetchAdapter>(FetchStrategyKind.HEADLESS_BROWSER),
      fake<Crawl4AiFetchAdapter>(FetchStrategyKind.CRAWL4AI),
      fake<FlareSolverrFetchAdapter>(FetchStrategyKind.FLARESOLVERR),
      fake<FirecrawlFetchAdapter>(FetchStrategyKind.FIRECRAWL),
      fake<ReaderProxyFetchAdapter>(FetchStrategyKind.READER_PROXY),
      fake<ArchiveSnapshotFetchAdapter>(FetchStrategyKind.ARCHIVE_SNAPSHOT),
    );

    for (const kind of Object.values(FetchStrategyKind)) {
      expect(registry.get(kind)?.kind).toBe(kind);
    }
  });
});
