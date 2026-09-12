import { TOOL_GET_CRAWLED_PAGE } from '../constants/ollama-cloud-tools.constants';
import { truncateResult } from './ollama-cloud-tool-runner.utility';
import type { CrawlRetrievalContext } from '../types/crawl-retrieval.types';
import type {
  OllamaCloudToolCall,
  OllamaCloudToolDefinition,
} from '../types/ollama-cloud-tool.types';

/**
 * Builds the `get_crawled_page` tool definition for one turn's SITE_CRAWL
 * pages. The available URLs are listed directly in the description rather
 * than left for the model to guess, because the model has already seen the
 * SAME URLs in its context (the crawl's evidence items) — repeating them
 * here is what lets it ask for one verbatim instead of inventing a
 * near-miss the lookup below would then reject.
 */
export function buildGetCrawledPageToolDefinition(
  retrieval: CrawlRetrievalContext,
): OllamaCloudToolDefinition {
  const urlList = retrieval.pages.map((page) => `- ${page.url}`).join('\n');
  return {
    type: 'function',
    function: {
      name: TOOL_GET_CRAWLED_PAGE,
      description: `Fetch the full text of one page already crawled for this conversation. Use this to read a specific page in full rather than relying on the shortened version already in context. Available pages:\n${urlList}`,
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'One of the exact URLs listed in this tool’s description.',
          },
        },
        required: ['url'],
      },
    },
  };
}

/**
 * Resolves a `get_crawled_page` call against pages already in memory — no
 * network call, no PAYG hold, no feature-usage record. The crawl that
 * produced this content was already metered by research-service; reading a
 * page a second time out of the same run costs nothing further.
 */
export function executeGetCrawledPage(
  call: OllamaCloudToolCall,
  retrieval: CrawlRetrievalContext,
): string {
  const url = call.function.arguments['url'];
  if (typeof url !== 'string' || url.length === 0) {
    return JSON.stringify({ error: 'get_crawled_page call missing required "url" argument' });
  }
  const page = retrieval.pages.find((candidate) => candidate.url === url);
  if (page === undefined) {
    return JSON.stringify({
      error: `No crawled page matches URL: ${url}`,
      availableUrls: retrieval.pages.map((candidate) => candidate.url),
    });
  }
  return truncateResult(
    JSON.stringify({ url: page.url, title: page.title, content: page.content }),
  );
}
