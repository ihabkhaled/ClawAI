import { Module } from '@nestjs/common';

import { FetchModule } from '../fetch/fetch.module';
import { ResearchModule } from '../research/research.module';
import { RuntimeCrawlConfigController } from './controllers/runtime-crawl-config.controller';
import { RuntimeCrawlController } from './controllers/runtime-crawl.controller';
import { ResearchAccessGuard } from './guards/research-access.guard';
import { RuntimeCrawlManager } from './managers/runtime-crawl.manager';
import { RuntimeCrawlConfigRepository } from './repositories/runtime-crawl-config.repository';
import { RuntimeCrawlPageRepository } from './repositories/runtime-crawl-page.repository';
import { RuntimeCrawlRunRepository } from './repositories/runtime-crawl-run.repository';
import { RuntimeCrawlBootstrapService } from './services/runtime-crawl-bootstrap.service';
import { RuntimeCrawlConfigService } from './services/runtime-crawl-config.service';
import { RuntimeCrawlRetentionService } from './services/runtime-crawl-retention.service';
import { RuntimeCrawlLimitsService } from './services/runtime-crawl-limits.service';

@Module({
  imports: [FetchModule, ResearchModule],
  controllers: [RuntimeCrawlController, RuntimeCrawlConfigController],
  providers: [
    ResearchAccessGuard,
    RuntimeCrawlConfigRepository,
    RuntimeCrawlRunRepository,
    RuntimeCrawlPageRepository,
    RuntimeCrawlConfigService,
    RuntimeCrawlLimitsService,
    RuntimeCrawlBootstrapService,
    RuntimeCrawlRetentionService,
    RuntimeCrawlManager,
  ],
})
export class RuntimeCrawlModule {}
