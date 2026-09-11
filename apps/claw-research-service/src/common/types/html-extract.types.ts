export type HreflangAlternate = {
  lang: string;
  url: string;
};

/**
 * Head metadata a page's `<head>` can carry. Every field is best-effort:
 * `null`/empty means "not present in this markup", not "verified absent" —
 * a page fetched without JS execution can genuinely lack tags a browser
 * would inject client-side. Callers that need to distinguish "absent" from
 * "not checked" should track that themselves; this type only reports what
 * was found in the HTML actually inspected.
 */
export type HtmlMetadata = {
  description: string | null;
  robotsDirective: string | null;
  canonicalUrl: string | null;
  hreflangAlternates: HreflangAlternate[];
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  /** Parsed JSON-LD blocks. Entries that fail to parse as JSON are skipped. */
  jsonLd: unknown[];
};

export type ExtractedHtml = {
  title: string | null;
  text: string;
  links: string[];
  metadata: HtmlMetadata;
};
