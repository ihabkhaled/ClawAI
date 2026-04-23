export type ExaSearchResponse = {
  results: Array<{
    id?: string;
    title?: string;
    url: string;
    text?: string;
    summary?: string;
    highlights?: string[];
    publishedDate?: string;
    score?: number;
  }>;
};
