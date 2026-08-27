import { DISCOVERY_CACHE_CONTROL } from '@/constants/seo-discovery.constants';
import { buildLlmsTxtResponse } from '@/lib/discovery/llms-txt.service';
import { shouldNoIndexEverything } from '@/lib/site/site-config';

// Derived from runtime SITE_URL, exactly like the sitemap and the feeds.
export const dynamic = 'force-dynamic';

export function GET(): Response {
  if (shouldNoIndexEverything()) {
    // A preview or misconfigured deployment publishes no site map of any kind.
    // 404 rather than an empty document: an empty one reads as "this site has
    // no pages", which is a worse lie than "there is nothing here".
    return new Response('Not found', { status: 404 });
  }
  return buildLlmsTxtResponse(DISCOVERY_CACHE_CONTROL);
}
