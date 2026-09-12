import {
  buildGetCrawledPageToolDefinition,
  executeGetCrawledPage,
} from '../utilities/crawl-retrieval-tool.utility';
import { TOOL_GET_CRAWLED_PAGE } from '../constants/ollama-cloud-tools.constants';
import { OLLAMA_TOOL_RESULT_MAX_CHARS } from '../constants/agentic-loop.constants';
import type { CrawlRetrievalContext } from '../types/crawl-retrieval.types';
import type { OllamaCloudToolCall } from '../types/ollama-cloud-tool.types';

function buildRetrieval(): CrawlRetrievalContext {
  return {
    pages: [
      { url: 'https://example.com/', title: 'Home', content: 'Homepage content' },
      { url: 'https://example.com/about', title: 'About', content: 'About page content' },
    ],
  };
}

function buildCall(url: unknown): OllamaCloudToolCall {
  return {
    id: 'call-1',
    function: { name: TOOL_GET_CRAWLED_PAGE, arguments: { url } },
  };
}

describe('buildGetCrawledPageToolDefinition', () => {
  it('names the tool and lists every crawled URL in its description', () => {
    const definition = buildGetCrawledPageToolDefinition(buildRetrieval());

    expect(definition.function.name).toBe(TOOL_GET_CRAWLED_PAGE);
    expect(definition.function.description).toContain('https://example.com/');
    expect(definition.function.description).toContain('https://example.com/about');
    expect(definition.function.parameters).toMatchObject({
      type: 'object',
      required: ['url'],
    });
  });
});

describe('executeGetCrawledPage', () => {
  it('returns the full page content for a URL that was crawled', () => {
    const result = executeGetCrawledPage(buildCall('https://example.com/about'), buildRetrieval());

    const parsed = JSON.parse(result) as { url: string; title: string | null; content: string };
    expect(parsed).toEqual({
      url: 'https://example.com/about',
      title: 'About',
      content: 'About page content',
    });
  });

  it('returns an error naming the available URLs when the URL was not crawled', () => {
    const result = executeGetCrawledPage(
      buildCall('https://example.com/not-crawled'),
      buildRetrieval(),
    );

    const parsed = JSON.parse(result) as { error: string; availableUrls: string[] };
    expect(parsed.error).toContain('https://example.com/not-crawled');
    expect(parsed.availableUrls).toEqual(['https://example.com/', 'https://example.com/about']);
  });

  it('returns an error without throwing when the url argument is missing', () => {
    const result = executeGetCrawledPage(buildCall(undefined), buildRetrieval());

    expect(() => JSON.parse(result) as { error: string }).not.toThrow();
    expect((JSON.parse(result) as { error: string }).error).toContain('missing required "url"');
  });

  it('truncates a page whose content exceeds the shared tool-result budget', () => {
    const longContent = 'x'.repeat(OLLAMA_TOOL_RESULT_MAX_CHARS + 500);
    const retrieval: CrawlRetrievalContext = {
      pages: [{ url: 'https://example.com/long', title: null, content: longContent }],
    };

    const result = executeGetCrawledPage(buildCall('https://example.com/long'), retrieval);

    expect(result.length).toBeLessThan(longContent.length);
    expect(result).toContain('[truncated:');
  });
});
