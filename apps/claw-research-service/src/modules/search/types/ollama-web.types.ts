export type OllamaWebSearchResult = {
  title: string;
  url: string;
  content: string | null;
};

export type OllamaWebSearchResponse = {
  results: OllamaWebSearchResult[];
};
