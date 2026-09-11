/** How a crawled page's URL was found. */
export enum CrawlDiscoveryMethod {
  /** The URL the user named directly — always the crawl's own homepage. */
  USER = 'user',
  SITEMAP = 'sitemap',
  /** Found in the homepage's own links, only used when the sitemap is thin. */
  LINK = 'link',
  /** Listed in an RSS/Atom feed the homepage advertised via autodiscovery. */
  FEED = 'feed',
}
