/**
 * The coarse, user-facing components the status page reports (B3).
 *
 * A component is a group of services named by what a person does with it,
 * never by the container that serves it. The status response must not carry a
 * service name, host or port (rules/19), so this enum is the whole vocabulary
 * the page speaks. `COMPONENT_MEMBERS` maps each one to its services.
 */
export enum StatusComponent {
  ACCOUNTS = 'accounts',
  CHAT = 'chat',
  FILES = 'files',
  /** ClamAV. Its own row: when it is down, every upload is refused (fail closed). */
  ANTIVIRUS = 'antivirus',
  IMAGES = 'images',
  RESEARCH = 'research',
  /** The scraping sidecars (ADR-121). Opt-in: disabled until an admin enables one. */
  WEB_SCRAPER_CRAWL4AI = 'web-scraper-crawl4ai',
  WEB_SCRAPER_FLARESOLVERR = 'web-scraper-flaresolverr',
  WEB_SCRAPER_FIRECRAWL = 'web-scraper-firecrawl',
  PAYMENTS = 'payments',
  WORKSPACES = 'workspaces',
  CODING_AGENT = 'coding-agent',
  LOCAL_MODELS = 'local-models',
  PLATFORM = 'platform',
}
