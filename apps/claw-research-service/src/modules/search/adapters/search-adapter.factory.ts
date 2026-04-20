import { HttpStatus, Injectable } from '@nestjs/common';

import { BusinessException } from '../../../common/errors/business.exception';
import { SearchProviderKind } from '../../../common/enums/search-provider-kind.enum';
import { OllamaWebSearchAdapter } from './ollama-web.adapter';
import { SearxngAdapter } from './searxng.adapter';
import { TavilyAdapter } from './tavily.adapter';
import type { SearchAdapter } from './search-adapter.interface';

@Injectable()
export class SearchAdapterFactory {
  constructor(
    private readonly tavily: TavilyAdapter,
    private readonly ollamaWeb: OllamaWebSearchAdapter,
    private readonly searxng: SearxngAdapter,
  ) {}

  getAdapter(kind: SearchProviderKind | string): SearchAdapter {
    switch (kind as SearchProviderKind) {
      case SearchProviderKind.TAVILY:
        return this.tavily;
      case SearchProviderKind.OLLAMA_WEB:
        return this.ollamaWeb;
      case SearchProviderKind.SEARXNG:
        return this.searxng;
      case SearchProviderKind.GENERIC_HTTP:
        throw new BusinessException(
          'research.search_provider.generic_http_not_implemented',
          'ADAPTER_NOT_IMPLEMENTED',
          HttpStatus.NOT_IMPLEMENTED,
          { kind },
        );
      default:
        throw new BusinessException(
          'research.search_provider.unsupported_kind',
          'UNSUPPORTED_PROVIDER',
          HttpStatus.BAD_REQUEST,
          { kind },
        );
    }
  }
}
