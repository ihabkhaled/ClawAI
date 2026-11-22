import { READABILITY_MIN_SHARE_OF_PLAIN_TEXT } from '../../../common/constants/readable-content.constants';
import { extractHtml } from '../../../common/utilities/html-extract.utility';
import { extractReadableContent } from '../../../common/utilities/readable-content.utility';
import { EMBEDDED_STATE_THIN_VISIBLE_CHARS } from '../constants/embedded-content.constants';
import { PageExtractionKind } from '../enums/page-extraction-kind.enum';
import { extractEmbeddedStateText } from './embedded-state.utility';
import { extractWithSiteAdapter } from './site-adapter.utility';
import type { PageContent } from '../types/page-content.types';

/**
 * One extraction for every strategy that ends with HTML in hand (plain,
 * TLS-impersonated, headless, archive, the sidecars that return HTML):
 * `extractHtml` for links, head metadata and a whole-page text fallback, and
 * Readability + Turndown for the article itself. Using the same function on
 * every tier is what keeps a page's text from changing shape depending on
 * which strategy happened to serve it.
 *
 * Then, in order: a registered site adapter (`SITE_ADAPTERS`) that reads the
 * page's own structured data wins; otherwise, when the visible text is thin,
 * the generic embedded-state extractor (JSON-LD, `__NEXT_DATA__`, React
 * Router stream, …) may supply the text. Both read only this HTML.
 */
export function extractPageContent(html: string, finalUrl: string): PageContent {
  const visible = extractVisibleContent(html, finalUrl);
  const adapted = extractWithSiteAdapter(html, finalUrl);
  if (adapted !== null) {
    return {
      ...visible,
      title: adapted.title ?? visible.title,
      content: adapted.text,
      extraction: PageExtractionKind.SITE_ADAPTER,
      siteAdapter: adapted.adapter,
    };
  }
  const visibleText = visible.content.trim();
  if (visibleText.length >= EMBEDDED_STATE_THIN_VISIBLE_CHARS) {
    return visible;
  }
  const state = extractEmbeddedStateText(html);
  if (state === null || state.text.length <= visibleText.length) {
    return visible;
  }
  const content =
    visibleText.length > 0 && !state.text.includes(visibleText)
      ? `${visibleText}\n\n${state.text}`
      : state.text;
  return { ...visible, content, extraction: PageExtractionKind.EMBEDDED_STATE };
}

function extractVisibleContent(html: string, finalUrl: string): PageContent {
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
    extraction: useReadable ? PageExtractionKind.READABLE : PageExtractionKind.PAGE_TEXT,
  };
}
