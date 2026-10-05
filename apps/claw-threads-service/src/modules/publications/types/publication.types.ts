export type PublishedPublication = {
  id: string;
  slug: string;
  title: string;
  content: { markdown: string };
  publishedAt: Date;
};

export type PublicPublication = {
  id: string;
  slug: string;
  title: string;
  content: { markdown: string; citations: Array<{ url: string }> };
  publishedAt: Date;
};

export type PublicationExport = {
  title: string;
  markdown: string;
  citations: Array<{ url: string }>;
};
