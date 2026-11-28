import { Module } from '@nestjs/common';

import { FetchModule } from '../fetch/fetch.module';
import { PlatformsModule } from '../platforms/platforms.module';
import { ScrapeModule } from '../scrape/scrape.module';
import { SearchModule } from '../search/search.module';
import { ResearchInternalController } from './controllers/research-internal.controller';
import { ResearchController } from './controllers/research.controller';
import { MultiQuerySearchManager } from './managers/multi-query-search.manager';
import { ResearchManager } from './managers/research.manager';
import { ResearchProgressPublisher } from './managers/research-progress-publisher.service';
import { SiteAuditManager } from './managers/site-audit.manager';
import { SiteCrawlManager } from './managers/site-crawl.manager';
import { ResearchRunRepository } from './repositories/research-run.repository';
import { ResearchSourceRepository } from './repositories/research-source.repository';
import { ResearchEvidenceStoreService } from './services/research-evidence-store.service';
import { ResearchSourceRetentionService } from './services/research-source-retention.service';
import { ResearchService } from './services/research.service';

@Module({
  imports: [SearchModule, FetchModule, ScrapeModule, PlatformsModule],
  controllers: [ResearchController, ResearchInternalController],
  providers: [
    ResearchRunRepository,
    ResearchSourceRepository,
    ResearchEvidenceStoreService,
    ResearchSourceRetentionService,
    MultiQuerySearchManager,
    ResearchManager,
    ResearchProgressPublisher,
    SiteCrawlManager,
    SiteAuditManager,
    ResearchService,
  ],
  exports: [ResearchManager, ResearchService, SiteCrawlManager],
})
export class ResearchModule {}
