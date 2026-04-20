export type SearxngResult = {
  title: string;
  url: string;
  content?: string | null;
  publishedDate?: string | null;
  score?: number;
  category?: string;
  engine?: string;
};

export type SearxngResponse = {
  query: string;
  number_of_results?: number;
  results: SearxngResult[];
};
