import { HttpStatus, Injectable } from '@nestjs/common';

import { BusinessException } from '../../../common/errors/business.exception';
import { ResearchErrorCode } from '../../../common/enums/research-error-code.enum';
import { SearchProviderKind } from '../../../common/enums/search-provider-kind.enum';
import { BraveAdapter } from './brave.adapter';
import { ExaAdapter } from './exa.adapter';
import { FirecrawlAdapter } from './firecrawl.adapter';
import { OllamaWebSearchAdapter } from './ollama-web.adapter';
import { SearxngAdapter } from './searxng.adapter';
import { SerpApiAdapter } from './serpapi.adapter';
import { TavilyAdapter } from './tavily.adapter';
import type { SearchAdapter } from './search-adapter.interface';

@Injectable()
export class SearchAdapterFactory {
  constructor(
    private readonly tavily: TavilyAdapter,
    private readonly ollamaWeb: OllamaWebSearchAdapter,
    private readonly searxng: SearxngAdapter,
    private readonly exa: ExaAdapter,
    private readonly firecrawl: FirecrawlAdapter,
    private readonly brave: BraveAdapter,
    private readonly serpApi: SerpApiAdapter,
  ) {}

  getAdapter(kind: SearchProviderKind | string): SearchAdapter {
    switch (kind as SearchProviderKind) {
      case SearchProviderKind.TAVILY:
        return this.tavily;
      case SearchProviderKind.OLLAMA_WEB:
        return this.ollamaWeb;
      case SearchProviderKind.SEARXNG:
        return this.searxng;
      case SearchProviderKind.EXA:
        return this.exa;
      case SearchProviderKind.FIRECRAWL:
        return this.firecrawl;
      case SearchProviderKind.BRAVE:
        return this.brave;
      case SearchProviderKind.SERPAPI:
        return this.serpApi;
      case SearchProviderKind.GENERIC_HTTP:
        throw new BusinessException(
          'research.search_provider.generic_http_not_implemented',
          ResearchErrorCode.ADAPTER_NOT_IMPLEMENTED,
          HttpStatus.NOT_IMPLEMENTED,
          { kind },
        );
      default:
        throw new BusinessException(
          'research.search_provider.unsupported_kind',
          ResearchErrorCode.UNSUPPORTED_PROVIDER,
          HttpStatus.BAD_REQUEST,
          { kind },
        );
    }
  }
}
