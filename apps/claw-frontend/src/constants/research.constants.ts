import { ResearchMode } from '@/enums/research-mode.enum';
import { ResearchProviderKind } from '@/enums/research-provider-kind.enum';
import type { ResearchOptions } from '@/types';

export const DEFAULT_RESEARCH_OPTIONS: ResearchOptions = { mode: ResearchMode.OFF };

export const RESEARCH_MODES: ReadonlyArray<{ value: ResearchMode; labelKey: string }> = [
  { value: ResearchMode.OFF, labelKey: 'research.modes.off' },
  { value: ResearchMode.SEARCH_ONLY, labelKey: 'research.modes.searchOnly' },
  { value: ResearchMode.SEARCH_THEN_FETCH, labelKey: 'research.modes.searchThenFetch' },
  { value: ResearchMode.SEARCH_FETCH_EXTRACT, labelKey: 'research.modes.searchFetchExtract' },
];

export const RESEARCH_PROVIDER_KINDS: ReadonlyArray<ResearchProviderKind> = [
  ResearchProviderKind.EXA,
  ResearchProviderKind.FIRECRAWL,
  ResearchProviderKind.BRAVE,
  ResearchProviderKind.SERPAPI,
  ResearchProviderKind.TAVILY,
  ResearchProviderKind.OLLAMA_WEB,
  ResearchProviderKind.SEARXNG,
];

export const RESEARCH_PROVIDER_DEFAULT_BASE_URLS: Record<ResearchProviderKind, string> = {
  [ResearchProviderKind.EXA]: 'https://api.exa.ai',
  [ResearchProviderKind.FIRECRAWL]: 'https://api.firecrawl.dev',
  [ResearchProviderKind.BRAVE]: 'https://api.search.brave.com',
  [ResearchProviderKind.SERPAPI]: 'https://serpapi.com',
  [ResearchProviderKind.TAVILY]: 'https://api.tavily.com',
  [ResearchProviderKind.OLLAMA_WEB]: 'https://ollama.com',
  [ResearchProviderKind.SEARXNG]: 'https://searx.example.com',
  [ResearchProviderKind.GENERIC_HTTP]: '',
};

export const RESEARCH_PROVIDER_LABELS: Record<ResearchProviderKind, string> = {
  [ResearchProviderKind.EXA]: 'Exa',
  [ResearchProviderKind.FIRECRAWL]: 'Firecrawl',
  [ResearchProviderKind.BRAVE]: 'Brave',
  [ResearchProviderKind.SERPAPI]: 'Google / SerpAPI',
  [ResearchProviderKind.TAVILY]: 'Tavily',
  [ResearchProviderKind.OLLAMA_WEB]: 'Ollama Web',
  [ResearchProviderKind.SEARXNG]: 'SearXNG',
  [ResearchProviderKind.GENERIC_HTTP]: 'Generic HTTP',
};

export const INITIAL_RESEARCH_PROVIDER_FORM = {
  kind: ResearchProviderKind.EXA,
  name: '',
  baseUrl: RESEARCH_PROVIDER_DEFAULT_BASE_URLS[ResearchProviderKind.EXA],
  apiKey: '',
};
