/** Subset of Tavily `/search` response we consume. */
export type TavilySearchResult = {
  title: string;
  url: string;
  content: string | null;
  raw_content?: string | null;
  published_date?: string | null;
  score: number;
};

export type TavilySearchResponse = {
  query: string;
  answer?: string | null;
  results: TavilySearchResult[];
  response_time?: number;
};
