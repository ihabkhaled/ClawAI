export type FirecrawlSearchResponse = {
  success?: boolean;
  data?: Array<{
    title?: string;
    url: string;
    description?: string;
    markdown?: string;
    metadata?: { publishedTime?: string };
  }>;
};
