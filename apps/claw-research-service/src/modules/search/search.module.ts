import { Module } from '@nestjs/common';

import { BraveAdapter } from './adapters/brave.adapter';
import { ExaAdapter } from './adapters/exa.adapter';
import { FirecrawlAdapter } from './adapters/firecrawl.adapter';
import { OllamaWebSearchAdapter } from './adapters/ollama-web.adapter';
import { SearchAdapterFactory } from './adapters/search-adapter.factory';
import { SearxngAdapter } from './adapters/searxng.adapter';
import { SerpApiAdapter } from './adapters/serpapi.adapter';
import { TavilyAdapter } from './adapters/tavily.adapter';
import { SearchController } from './controllers/search.controller';
import { SearchProviderController } from './controllers/search-provider.controller';
import { SearchProviderRepository } from './repositories/search-provider.repository';
import { SearchRunRepository } from './repositories/search-run.repository';
import { SearchExecutionService } from './services/search-execution.service';
import { SearchProviderBootstrapService } from './services/search-provider-bootstrap.service';
import { SearchProviderService } from './services/search-provider.service';

@Module({
  controllers: [SearchProviderController, SearchController],
  providers: [
    SearchProviderRepository,
    SearchRunRepository,
    SearchProviderBootstrapService,
    SearchProviderService,
    SearchExecutionService,
    SearchAdapterFactory,
    TavilyAdapter,
    OllamaWebSearchAdapter,
    SearxngAdapter,
    ExaAdapter,
    FirecrawlAdapter,
    BraveAdapter,
    SerpApiAdapter,
  ],
  exports: [SearchProviderService, SearchExecutionService],
})
export class SearchModule {}
