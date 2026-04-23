export type BraveSearchResponse = {
  web?: {
    results?: Array<{
      title?: string;
      url: string;
      description?: string;
      age?: string;
      page_age?: string;
      profile?: { long_name?: string };
    }>;
  };
};
