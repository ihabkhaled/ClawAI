export type SitemapAlternate = { language: string; url: string };
export type SitemapUrlEntry = {
  url: string;
  lastModified: string;
  alternates?: ReadonlyArray<SitemapAlternate>;
};
export type RssFeedItem = {
  title: string;
  description: string;
  url: string;
  guid: string;
  publishedAt: string;
  category: string;
};
export type RssFeedDefinition = {
  title: string;
  description: string;
  url: string;
  siteUrl: string;
  language: string;
  lastBuildDate: string;
  items: ReadonlyArray<RssFeedItem>;
};
export type DiscoveryRouteContext = {
  params: Promise<{ locale: string; document: string }>;
};
