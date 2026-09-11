/**
 * Extremely small HTML → text + metadata extractor. We intentionally avoid
 * browser-DOM dependencies. For full-fidelity extraction, the scrape layer
 * (phase 5) will add a dedicated adapter.
 */
import {
  HTML_ATTR_RE,
  HTML_BLOCKED_SCHEMES,
  HTML_ENTITY_MAP,
  HTML_ENTITY_RE,
  HTML_JSON_LD_RE,
  HTML_LINK_RE,
  HTML_LINK_TAG_RE,
  HTML_META_TAG_RE,
  HTML_SCRIPT_STYLE_RE,
  HTML_TAG_RE,
  HTML_TITLE_RE,
  HTML_WHITESPACE_RE,
  OG_PREFIX,
  TWITTER_PREFIX,
} from '../constants/html-extract.constants';
import type { ExtractedHtml, HtmlMetadata } from '../types/html-extract.types';

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

  return { title, text, links: [...links], metadata: extractMetadata(html, baseUrl) };
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

function attr(tag: string, name: keyof typeof HTML_ATTR_RE): string | null {
  const match = tag.match(HTML_ATTR_RE[name]);
  return match?.[1] ?? null;
}

/**
 * Head metadata, best-effort. Every `<meta>`/`<link>` tag is matched whole
 * first (`HTML_META_TAG_RE`/`HTML_LINK_TAG_RE`), then its attributes are read
 * out of that one tag's substring — attribute order in the source markup is
 * never assumed.
 */
function extractMetadata(html: string, baseUrl: string | null): HtmlMetadata {
  const metadata: HtmlMetadata = {
    description: null,
    robotsDirective: null,
    canonicalUrl: null,
    hreflangAlternates: [],
    openGraph: {},
    twitterCard: {},
    jsonLd: [],
  };

  for (const tag of html.match(HTML_META_TAG_RE) ?? []) {
    const content = attr(tag, 'content');
    if (content === null) {
      continue;
    }
    const name = attr(tag, 'name')?.toLowerCase();
    const property = attr(tag, 'property')?.toLowerCase();

    if (name === 'description' && metadata.description === null) {
      metadata.description = content;
    } else if (name === 'robots' && metadata.robotsDirective === null) {
      metadata.robotsDirective = content;
    } else if (property?.startsWith(OG_PREFIX)) {
      metadata.openGraph[property.slice(OG_PREFIX.length)] = content;
    } else if (name?.startsWith(TWITTER_PREFIX)) {
      metadata.twitterCard[name.slice(TWITTER_PREFIX.length)] = content;
    }
  }

  for (const tag of html.match(HTML_LINK_TAG_RE) ?? []) {
    const rel = attr(tag, 'rel')?.toLowerCase();
    const href = attr(tag, 'href');
    if (href === null) {
      continue;
    }
    if (rel === 'canonical' && metadata.canonicalUrl === null) {
      metadata.canonicalUrl = resolveLink(href, baseUrl) ?? href;
    } else if (rel === 'alternate') {
      const hreflang = attr(tag, 'hreflang');
      if (hreflang !== null) {
        metadata.hreflangAlternates.push({
          lang: hreflang,
          url: resolveLink(href, baseUrl) ?? href,
        });
      }
    }
  }

  const jsonLdPattern = new RegExp(HTML_JSON_LD_RE.source, HTML_JSON_LD_RE.flags);
  for (const match of html.matchAll(jsonLdPattern)) {
    const raw = match[1]?.trim();
    if (raw === undefined || raw.length === 0) {
      continue;
    }
    try {
      metadata.jsonLd.push(JSON.parse(raw));
    } catch {
      // Malformed JSON-LD is common in the wild; skip rather than fail the
      // whole extraction over one bad block.
    }
  }

  return metadata;
}
