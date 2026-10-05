export type PublishedPublication = {
  id: string;
  slug: string;
  title: string;
  content: { markdown: string };
  publishedAt: Date;
};
