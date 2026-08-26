import { RSS_CONTENT_TYPE, XML_CONTENT_TYPE } from '@/constants/seo-discovery.constants';

/**
 * Content type for a feed response, chosen by who is asking.
 *
 * `application/rss+xml` is the correct type and the one feed readers look for,
 * but Chrome treats every feed MIME as "display the source" and never applies a
 * stylesheet to it. A person opening /rss.xml in the address bar therefore got
 * the same unreadable wall of text the sitemaps used to show, while the
 * stylesheet sat one MIME type away.
 *
 * A browser navigation announces `Accept: text/html`; a feed reader does not.
 * Serving those two callers different types is the whole trick: readers keep the
 * canonical feed type, and a person gets XML the browser will style.
 *
 * The bytes are identical either way — this changes presentation, not content.
 */
export function resolveFeedContentType(request: Request): string {
  const accept = request.headers.get('accept') ?? '';
  return accept.includes('text/html') ? XML_CONTENT_TYPE : RSS_CONTENT_TYPE;
}
