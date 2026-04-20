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
  ResearchProviderKind.TAVILY,
  ResearchProviderKind.OLLAMA_WEB,
  ResearchProviderKind.SEARXNG,
];

export const INITIAL_RESEARCH_PROVIDER_FORM = {
  kind: ResearchProviderKind.TAVILY,
  name: '',
  baseUrl: 'https://api.tavily.com',
  apiKey: '',
};
