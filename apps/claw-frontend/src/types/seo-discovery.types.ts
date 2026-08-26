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
  /**
   * BCP-47 tag for this item, emitted as `dc:language`.
   *
   * RSS 2.0 has one `<language>` for the whole channel, which is fine for the
   * per-locale feeds and useless for the global one — a reader would see 13
   * languages all claiming to be English. Dublin Core is the standard way to
   * say it per item.
   */
  language?: string;
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
