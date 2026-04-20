import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { BusinessException } from '../../../../common/errors/business.exception';
import { OllamaWebSearchAdapter } from '../ollama-web.adapter';
import { SearxngAdapter } from '../searxng.adapter';
import { TavilyAdapter } from '../tavily.adapter';
import { SearchAdapterFactory } from '../search-adapter.factory';

describe('SearchAdapterFactory', () => {
  const tavily = new TavilyAdapter();
  const ollama = new OllamaWebSearchAdapter();
  const searxng = new SearxngAdapter();
  const factory = new SearchAdapterFactory(tavily, ollama, searxng);

  it.each([
    [SearchProviderKind.TAVILY, tavily],
    [SearchProviderKind.OLLAMA_WEB, ollama],
    [SearchProviderKind.SEARXNG, searxng],
  ])('returns the correct adapter for kind %s', (kind, expected) => {
    expect(factory.getAdapter(kind)).toBe(expected);
  });

  it('throws ADAPTER_NOT_IMPLEMENTED for GENERIC_HTTP', () => {
    expect.assertions(2);
    try {
      factory.getAdapter(SearchProviderKind.GENERIC_HTTP);
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).code).toBe('ADAPTER_NOT_IMPLEMENTED');
    }
  });

  it('throws UNSUPPORTED_PROVIDER for unknown kinds', () => {
    expect.assertions(2);
    try {
      factory.getAdapter('NOT_A_REAL_KIND');
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).code).toBe('UNSUPPORTED_PROVIDER');
    }
  });
});
