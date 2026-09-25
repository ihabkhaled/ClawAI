import { Module } from '@nestjs/common';

import { ArchiveSnapshotFetchAdapter } from './adapters/archive-snapshot-fetch.adapter';
import { Crawl4AiFetchAdapter } from './adapters/crawl4ai-fetch.adapter';
import { FirecrawlFetchAdapter } from './adapters/firecrawl-fetch.adapter';
import { FlareSolverrFetchAdapter } from './adapters/flaresolverr-fetch.adapter';
import { HeadlessFetchAdapter } from './adapters/headless-fetch.adapter';
import { HttpFetchAdapter } from './adapters/http-fetch.adapter';
import { OfficialApiFetchAdapter } from './adapters/official-api-fetch.adapter';
import { ReaderProxyFetchAdapter } from './adapters/reader-proxy-fetch.adapter';
import { RobotsTxtAdapter } from './adapters/robots-txt.adapter';
import { TlsImpersonateFetchAdapter } from './adapters/tls-impersonate-fetch.adapter';
import { FetchController } from './controllers/fetch.controller';
import { FetchStrategyController } from './controllers/fetch-strategy.controller';
import { FetchJobRepository } from './repositories/fetch-job.repository';
import { FetchStrategyConfigRepository } from './repositories/fetch-strategy-config.repository';
import { HostStrategyMemoryRepository } from './repositories/host-strategy-memory.repository';
import { PageCacheRepository } from './repositories/page-cache.repository';
import { FetchStrategyBootstrapService } from './services/fetch-strategy-bootstrap.service';
import { FetchStrategyOrchestratorService } from './services/fetch-strategy-orchestrator.service';
import { FetchStrategyRegistryService } from './services/fetch-strategy-registry.service';
import { FetchStrategyStatusService } from './services/fetch-strategy-status.service';
import { FetchService } from './services/fetch.service';
import { RobotsPolicyService } from './services/robots-policy.service';

@Module({
  controllers: [FetchController, FetchStrategyController],
  providers: [
    OfficialApiFetchAdapter,
    HttpFetchAdapter,
    TlsImpersonateFetchAdapter,
    HeadlessFetchAdapter,
    Crawl4AiFetchAdapter,
    FlareSolverrFetchAdapter,
    FirecrawlFetchAdapter,
    ReaderProxyFetchAdapter,
    ArchiveSnapshotFetchAdapter,
    RobotsTxtAdapter,
    FetchJobRepository,
    PageCacheRepository,
    FetchStrategyConfigRepository,
    HostStrategyMemoryRepository,
    FetchStrategyRegistryService,
    FetchStrategyBootstrapService,
    FetchStrategyStatusService,
    FetchStrategyOrchestratorService,
    RobotsPolicyService,
    FetchService,
  ],
  exports: [FetchService],
})
export class FetchModule {}
