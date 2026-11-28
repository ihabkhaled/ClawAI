import { clampSearchQuery } from '../../../common/utilities/search-query.utility';
import type { ResearchPlatform } from '../../../generated/prisma';

/** Lower-case hostname without a leading `www.`; null when the URL does not parse. */
export function normalizedHostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./u, '');
  } catch {
    return null;
  }
}

/** Suffix match on a label boundary: `old.reddit.com` matches `reddit.com`; `notreddit.com` does not. */
export function hostMatchesDomain(host: string, domain: string): boolean {
  const wanted = domain
    .trim()
    .toLowerCase()
    .replace(/^www\./u, '');
  return wanted.length > 0 && (host === wanted || host.endsWith(`.${wanted}`));
}

/** Whether the URL's host is one of the platform's domains. */
export function urlMatchesPlatform(
  url: string,
  platform: Pick<ResearchPlatform, 'domains'>,
): boolean {
  const host = normalizedHostOf(url);
  return host !== null && platform.domains.some((domain) => hostMatchesDomain(host, domain));
}

/** The first platform (in the given order) whose domain the URL's host matches; null otherwise. */
export function platformForUrl<T extends Pick<ResearchPlatform, 'domains'>>(
  url: string,
  platforms: readonly T[],
): T | null {
  const host = normalizedHostOf(url);
  return host === null
    ? null
    : (platforms.find((platform) =>
        platform.domains.some((domain) => hostMatchesDomain(host, domain)),
      ) ?? null);
}

/** `site:<first domain> <query>`, clamped to the provider query limit. */
export function siteQueryOf(platform: Pick<ResearchPlatform, 'domains'>, query: string): string {
  const domain = platform.domains[0] ?? '';
  return clampSearchQuery(`site:${domain} ${query}`).query;
}
