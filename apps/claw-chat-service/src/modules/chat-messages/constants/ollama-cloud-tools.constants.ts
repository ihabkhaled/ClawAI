import type { OllamaCloudToolDefinition } from '../types/ollama-cloud-tool.types';

// Tool names recognized by ollama.com/api/web_search and /api/web_fetch.
// Both endpoints are documented at https://docs.ollama.com/capabilities/web-search.
export const TOOL_WEB_SEARCH = 'web_search';
export const TOOL_WEB_FETCH = 'web_fetch';

// Resolved locally from `ExecutionOptions.crawlRetrieval`, never proxied to
// Ollama Cloud — see `crawl-retrieval-tool.utility.ts`. Not one of the two
// names above because it answers from a SITE_CRAWL run already in memory,
// not from a new network call.
export const TOOL_GET_CRAWLED_PAGE = 'get_crawled_page';

// JSON-schema descriptors exposed to the agentic model in the `tools`
// field of /api/chat. Mirrors the schemas shown in the Ollama docs so
// the model emits compatible arguments shapes.
export const OLLAMA_CLOUD_TOOL_DEFINITIONS: OllamaCloudToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: TOOL_WEB_SEARCH,
      description:
        'Search the web for up-to-date information. Returns a list of result objects with title, url, and content snippets.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The natural-language search query to run.',
          },
          max_results: {
            type: 'integer',
            description: 'Maximum number of results to return (default 5).',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: TOOL_WEB_FETCH,
      description:
        'Fetch the readable text content of a single web page given its URL. Use this when web_search results show a URL worth reading in full.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The absolute URL (must start with http:// or https://) to fetch.',
          },
        },
        required: ['url'],
      },
    },
  },
];
