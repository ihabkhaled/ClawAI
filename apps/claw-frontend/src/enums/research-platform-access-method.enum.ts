/**
 * How research reaches a platform. Mirrors research-service `PlatformAccessMethod`: `site:` search
 * through the search providers, or the platform's own free API.
 */
export enum ResearchPlatformAccessMethod {
  SITE_SEARCH = 'SITE_SEARCH',
  OFFICIAL_API = 'OFFICIAL_API',
}
