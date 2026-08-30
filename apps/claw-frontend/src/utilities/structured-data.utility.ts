import { MARKETING_GITHUB_URL } from '@/constants/marketing-nav.constants';
import type { SharedChatJsonLdInput } from '@/types/chat-share-page.types';
import type { PublicPlan } from '@/types/public-pricing.types';
import type {
  CodingAgentJsonLdInput,
  ComparisonHubJsonLdInput,
  ComparisonJsonLdInput,
  JsonLdObject,
  LearnHubJsonLdInput,
  LearnTopicJsonLdInput,
  PublicFaqJsonLdInput,
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

/**
 * Structured data for the Coding Agent overview.
 *
 * `applicationCategory: DeveloperApplication` and an explicit
 * `operatingSystem` because the thing being described is an editor extension,
 * not a web page about one. `offers` is free: the extension itself costs
 * nothing — a ClawAI subscription is what is paid for, and claiming otherwise
 * here would be a price claim in structured data that the pricing page
 * contradicts.
 */
export function buildCodingAgentJsonLd(input: CodingAgentJsonLdInput): JsonLdObject {
  const origin = new URL(input.canonicalUrl).origin;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: input.name,
        description: input.description,
        url: input.canonicalUrl,
        inLanguage: input.language,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Windows, macOS, Linux',
        downloadUrl: input.downloadUrl,
        installUrl: input.downloadUrl,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        isPartOf: { '@type': 'WebSite', name: 'ClawAI', url: origin },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ClawAI', item: origin },
          { '@type': 'ListItem', position: 2, name: input.name, item: input.canonicalUrl },
        ],
      },
    ],
  };
}

/**
 * Structured data for any page whose body is a question-and-answer list.
 *
 * Built from the same array the page renders, so the visible text and the
 * structured data cannot drift — which is the condition attached to FAQ rich
 * results, and the reason both come from one source object here.
 */
export function buildPublicFaqJsonLd(input: PublicFaqJsonLdInput): JsonLdObject {
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
        isPartOf: { '@type': 'WebSite', name: 'ClawAI', url: origin },
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
/**
 * A `/learn` explainer.
 *
 * `TechArticle` rather than `WebPage`: these pages teach a technique, and the
 * type is the one piece of structured data that tells a crawler which kind of
 * page it is looking at. `datePublished` and `dateModified` both carry the
 * cluster review date — an explainer with no date is indistinguishable from an
 * abandoned one, and that date is only moved after the claims are re-read.
 *
 * The FAQ is built from the same array the page renders, so visible text and
 * structured data cannot drift.
 */
export function buildLearnTopicJsonLd(input: LearnTopicJsonLdInput): JsonLdObject {
  const origin = new URL(input.canonicalUrl).origin;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        headline: input.name,
        description: input.description,
        url: input.canonicalUrl,
        inLanguage: input.language,
        datePublished: input.lastReviewed,
        dateModified: input.lastReviewed,
        isPartOf: { '@type': 'WebSite', name: 'ClawAI', url: origin },
        publisher: { '@type': 'Organization', name: 'ClawAI', url: origin },
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

/** The `/learn` hub: the page, its trail, and the explainers it lists. */
export function buildLearnHubJsonLd(input: LearnHubJsonLdInput): JsonLdObject {
  const origin = new URL(input.canonicalUrl).origin;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
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

export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}
