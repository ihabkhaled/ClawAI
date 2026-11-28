import { Module } from '@nestjs/common';

import { SearchModule } from '../search/search.module';
import { ArxivAdapter } from './adapters/arxiv.adapter';
import { CrossrefAdapter } from './adapters/crossref.adapter';
import { GithubAdapter } from './adapters/github.adapter';
import { HnAlgoliaAdapter } from './adapters/hn-algolia.adapter';
import { OpenAlexAdapter } from './adapters/openalex.adapter';
import { PlatformApiAdapterFactory } from './adapters/platform-api-adapter.factory';
import { PubMedAdapter } from './adapters/pubmed.adapter';
import { SemanticScholarAdapter } from './adapters/semantic-scholar.adapter';
import { StackExchangeAdapter } from './adapters/stack-exchange.adapter';
import { WikipediaAdapter } from './adapters/wikipedia.adapter';
import { ResearchPlatformController } from './controllers/research-platform.controller';
import { ResearchPlatformRepository } from './repositories/research-platform.repository';
import { PlatformSearchService } from './services/platform-search.service';
import { ResearchPlatformBootstrapService } from './services/research-platform-bootstrap.service';
import { ResearchPlatformService } from './services/research-platform.service';

/** Platform registry + official-API adapters (research engine B3). */
@Module({
  imports: [SearchModule],
  controllers: [ResearchPlatformController],
  providers: [
    ResearchPlatformRepository,
    ResearchPlatformBootstrapService,
    ResearchPlatformService,
    PlatformSearchService,
    PlatformApiAdapterFactory,
    OpenAlexAdapter,
    SemanticScholarAdapter,
    PubMedAdapter,
    CrossrefAdapter,
    ArxivAdapter,
    StackExchangeAdapter,
    HnAlgoliaAdapter,
    GithubAdapter,
    WikipediaAdapter,
  ],
  exports: [PlatformSearchService],
})
export class PlatformsModule {}
