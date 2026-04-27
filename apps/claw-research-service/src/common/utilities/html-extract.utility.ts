/**
 * Extremely small HTML → text + metadata extractor. We intentionally avoid
 * browser-DOM dependencies. For full-fidelity extraction, the scrape layer
 * (phase 5) will add a dedicated adapter.
 */
import {
  HTML_BLOCKED_SCHEMES,
  HTML_ENTITY_MAP,
  HTML_ENTITY_RE,
  HTML_LINK_RE,
  HTML_SCRIPT_STYLE_RE,
  HTML_TAG_RE,
  HTML_TITLE_RE,
  HTML_WHITESPACE_RE,
} from '../constants/html-extract.constants';
import type { ExtractedHtml } from '../types/html-extract.types';

export function extractHtml(html: string, baseUrl: string | null = null): ExtractedHtml {
  const titleMatch = html.match(HTML_TITLE_RE);
  const title = titleMatch?.[1]?.trim() ?? null;

  const stripped = html.replaceAll(HTML_SCRIPT_STYLE_RE, ' ').replaceAll(HTML_TAG_RE, ' ');
  const decoded = stripped.replaceAll(
    HTML_ENTITY_RE,
    (match, entity: string) => HTML_ENTITY_MAP.get(entity) ?? match,
  );
  const text = decoded.replaceAll(HTML_WHITESPACE_RE, ' ').trim();

  const links = new Set<string>();
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = HTML_LINK_RE.exec(html)) !== null) {
    const href = linkMatch[1];
    if (href === undefined) {
      continue;
    }
    const resolved = resolveLink(href, baseUrl);
    if (resolved !== null) {
      links.add(resolved);
    }
  }

  return { title, text, links: [...links] };
}

function resolveLink(href: string, baseUrl: string | null): string | null {
  if (href.startsWith('#')) {
    return null;
  }
  const lower = href.toLowerCase();
  if (HTML_BLOCKED_SCHEMES.some((scheme) => lower.startsWith(scheme))) {
    return null;
  }
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return href;
  }
  if (baseUrl === null) {
    return null;
  }
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}
