export type SerpApiResponse = {
  organic_results?: Array<{
    position?: number;
    title?: string;
    link: string;
    snippet?: string;
    date?: string;
  }>;
};
