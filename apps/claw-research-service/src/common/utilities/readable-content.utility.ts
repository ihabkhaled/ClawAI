import readabilityModule from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';

import {
  ABSOLUTE_OR_FRAGMENT_PATTERN,
  MARKDOWN_LINK_TARGET_PATTERN,
  READABILITY_CHAR_THRESHOLD,
  READABILITY_MAX_INPUT_BYTES,
} from '../constants/readable-content.constants';
import type { ReadableContent } from '../types/readable-content.types';

/**
 * The one wrapper around @mozilla/readability + linkedom + turndown
 * (rule 13): finds a page's main article and returns it as Markdown.
 *
 * linkedom, not jsdom: it parses an order of magnitude faster and does not
 * build a layout tree nobody here needs. Returns `null` — never throws —
 * when the page has no article-shaped content (a search page, a shell, a
 * login form); the caller then keeps the plain `extractHtml` text.
 */
export function extractReadableContent(html: string, pageUrl: string): ReadableContent | null {
  if (html.length === 0 || html.length > READABILITY_MAX_INPUT_BYTES) {
    return null;
  }
  try {
    const { document } = parseHTML(html);
    // CommonJS package: reached through its default export, never a named
    // import (rule 13 §6/§7).
    const article = new readabilityModule.Readability(document, {
      charThreshold: READABILITY_CHAR_THRESHOLD,
    }).parse();
    // Readability retries with ever-looser thresholds and returns its best
    // guess even for a two-word page; below our own floor that guess is not
    // an article.
    const textLength = article?.textContent?.trim().length ?? 0;
    if (article === null || textLength < READABILITY_CHAR_THRESHOLD) {
      return null;
    }
    const contentHtml = article.content ?? '';
    const markdown = createTurndown().turndown(contentHtml).trim();
    if (markdown.length === 0) {
      return null;
    }
    return {
      title: normalizeTitle(article.title),
      markdown: absolutizeRootRelativeLinks(markdown, pageUrl),
      textLength,
    };
  } catch {
    return null;
  }
}

function createTurndown(): TurndownService {
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
  service.remove(['script', 'style', 'noscript', 'iframe']);
  return service;
}

function normalizeTitle(title: string | null | undefined): string | null {
  const trimmed = title?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolves every relative Markdown link target (`](/a)`, `](./a)`, `](a)`)
 * against the page URL, so a link means the same thing once the text leaves
 * the page. Absolute URLs, `mailto:` and `#fragment` links are left alone.
 */
function absolutizeRootRelativeLinks(markdown: string, pageUrl: string): string {
  return markdown.replaceAll(MARKDOWN_LINK_TARGET_PATTERN, (whole: string, target: string) => {
    if (ABSOLUTE_OR_FRAGMENT_PATTERN.test(target)) {
      return whole;
    }
    try {
      return `](${new URL(target, pageUrl).href}`;
    } catch {
      return whole;
    }
  });
}
