import { READABILITY_MIN_SHARE_OF_PLAIN_TEXT } from '../../../common/constants/readable-content.constants';
import { extractHtml } from '../../../common/utilities/html-extract.utility';
import { extractReadableContent } from '../../../common/utilities/readable-content.utility';
import type { PageContent } from '../types/page-content.types';

/**
 * One extraction for every strategy that ends with HTML in hand (plain,
 * TLS-impersonated, headless, archive, the sidecars that return HTML):
 * `extractHtml` for links, head metadata and a whole-page text fallback, and
 * Readability + Turndown for the article itself. Using the same function on
 * every tier is what keeps a page's text from changing shape depending on
 * which strategy happened to serve it.
 */
export function extractPageContent(html: string, finalUrl: string): PageContent {
  const plain = extractHtml(html, finalUrl);
  const readable = extractReadableContent(html, finalUrl);
  const plainLength = plain.text.trim().length;
  const useReadable =
    readable !== null && readable.textLength >= plainLength * READABILITY_MIN_SHARE_OF_PLAIN_TEXT;

  return {
    title: plain.title ?? readable?.title ?? null,
    content: useReadable ? readable.markdown : plain.text,
    links: plain.links,
    metadata: plain.metadata,
    readable: useReadable,
  };
}
