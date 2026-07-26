import { MARKETING_GITHUB_URL } from '@/constants/marketing-nav.constants';
import type { SharedChatJsonLdInput } from '@/types/chat-share-page.types';
import type { JsonLdObject } from '@/types/structured-data.types';

// Only facts the application and repository actually support — no
// fabricated ratings, reviews, prices, or provider endorsements.
export function buildWebsiteJsonLd(siteUrl: string): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ClawAI',
    url: siteUrl,
  };
}

export function buildOrganizationJsonLd(siteUrl: string): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ClawAI',
    url: siteUrl,
    sameAs: [MARKETING_GITHUB_URL],
  };
}

export function buildSoftwareApplicationJsonLd(siteUrl: string): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ClawAI',
    url: siteUrl,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Linux, Windows, macOS (self-hosted via Docker)',
  };
}

/**
 * Structured data for one published chat.
 *
 * `WebPage` and nothing more ambitious. A shared chat is not an `Article` (no
 * human author to credit), not a `QAPage` (not a community answering a question),
 * not a `NewsArticle`, and not a `Review` — claiming any of those would be lying to
 * a search engine about what the page is, which is both a policy violation and an
 * invitation to be de-indexed.
 *
 * Every string here reaches the serializer, and on this page they come from user
 * content. That is why `serializeJsonLd` escapes rather than trusting the input:
 * see the note on that function.
 */
export function buildSharedChatJsonLd(input: SharedChatJsonLdInput): JsonLdObject {
  const jsonLd: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: input.title,
    url: input.canonicalUrl,
    datePublished: input.publishedAt,
    dateModified: input.updatedAt,
    inLanguage: input.contentLanguage,
    isAccessibleForFree: true,
  };
  if (input.description !== null) {
    jsonLd['description'] = input.description;
  }
  return jsonLd;
}

/**
 * Serialises JSON-LD for inline embedding.
 *
 * `<` is escaped because a `</script>` sequence anywhere inside a string value
 * would close the block early and start executing whatever follows. On the static
 * marketing pages every value is developer-controlled and this is belt-and-braces;
 * on a shared chat page the title and description are USER content, so it is the
 * actual control preventing a chat titled `</script><script>…` from running code
 * for every visitor.
 */
export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}
