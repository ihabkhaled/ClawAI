import { MARKETING_GITHUB_URL } from '@/constants/marketing-nav.constants';
import type { SharedChatJsonLdInput } from '@/types/chat-share-page.types';
import type { PublicPlan } from '@/types/public-pricing.types';
import type {
  ComparisonHubJsonLdInput,
  ComparisonJsonLdInput,
  JsonLdObject,
  PublicPageJsonLdInput,
} from '@/types/structured-data.types';
import { formatPriceDecimal } from '@/utilities/pricing-catalog.utility';

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

export function buildPublicPageJsonLd(input: PublicPageJsonLdInput): JsonLdObject {
  const canonicalUrl = new URL(input.canonicalUrl);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: input.name,
    description: input.description,
    url: input.canonicalUrl,
    inLanguage: input.language,
    dateModified: input.lastReviewed,
    isPartOf: {
      '@type': 'WebSite',
      name: 'ClawAI',
      url: canonicalUrl.origin,
    },
  };
}

/**
 * Structured data for one comparison page.
 *
 * A `@graph` rather than three separate script blocks, so the WebPage, the
 * breadcrumb trail and the FAQ are one connected description of one URL instead
 * of three unrelated documents a parser has to guess the relationship between.
 *
 * Deliberately NOT a `Review`, `AggregateRating` or `Product` comparison: those
 * types carry a rating from a reviewer, and inventing one for a page the vendor
 * wrote about its own competitors is exactly the fabricated-review case that
 * gets structured data ignored and pages demoted. `WebPage` + `FAQPage` claims
 * only what the page actually is.
 */
export function buildComparisonJsonLd(input: ComparisonJsonLdInput): JsonLdObject {
  const origin = new URL(input.canonicalUrl).origin;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: input.name,
        description: input.description,
        url: input.canonicalUrl,
        inLanguage: input.language,
        dateModified: input.lastReviewed,
        isPartOf: { '@type': 'WebSite', name: 'ClawAI', url: origin },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ClawAI', item: origin },
          { '@type': 'ListItem', position: 2, name: input.hubName, item: input.hubUrl },
          { '@type': 'ListItem', position: 3, name: input.name, item: input.canonicalUrl },
        ],
      },
      {
        '@type': 'FAQPage',
        url: input.canonicalUrl,
        inLanguage: input.language,
        mainEntity: input.faq.map((entry) => ({
          '@type': 'Question',
          name: entry.question,
          acceptedAnswer: { '@type': 'Answer', text: entry.answer },
        })),
      },
    ],
  };
}

/** Structured data for the comparison hub: the page, its trail, and what it lists. */
export function buildComparisonHubJsonLd(input: ComparisonHubJsonLdInput): JsonLdObject {
  const origin = new URL(input.canonicalUrl).origin;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: input.name,
        description: input.description,
        url: input.canonicalUrl,
        inLanguage: input.language,
        dateModified: input.lastReviewed,
        isPartOf: { '@type': 'WebSite', name: 'ClawAI', url: origin },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ClawAI', item: origin },
          { '@type': 'ListItem', position: 2, name: input.name, item: input.canonicalUrl },
        ],
      },
      {
        '@type': 'ItemList',
        itemListElement: input.items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          url: item.url,
        })),
      },
    ],
  };
}

export function buildPricingJsonLd(canonicalUrl: string, plans: PublicPlan[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'ClawAI pricing',
    url: canonicalUrl,
    mainEntity: {
      '@type': 'OfferCatalog',
      name: 'ClawAI subscription plans',
      itemListElement: plans.flatMap((plan) =>
        plan.prices
          .filter((price) => price.isActive)
          .map((price) => ({
            '@type': 'Offer',
            name: `${plan.name} ${price.billingInterval.toLowerCase()}`,
            price: formatPriceDecimal(price),
            priceCurrency: price.currency,
            url: canonicalUrl,
          })),
      ),
    },
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
