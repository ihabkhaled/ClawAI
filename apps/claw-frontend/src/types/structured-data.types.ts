import type { ComparisonFaqEntry } from '@/types/public-comparison.types';

export type JsonLdObject = Record<string, unknown>;

export type PublicPageJsonLdInput = {
  name: string;
  description: string;
  canonicalUrl: string;
  language: string;
  lastReviewed: string;
};

export type ComparisonJsonLdInput = PublicPageJsonLdInput & {
  /** Absolute URL and title of the comparison hub, for the breadcrumb trail. */
  hubUrl: string;
  hubName: string;
  faq: ReadonlyArray<ComparisonFaqEntry>;
};

export type ComparisonHubJsonLdItem = {
  name: string;
  url: string;
};

export type ComparisonHubJsonLdInput = PublicPageJsonLdInput & {
  items: ReadonlyArray<ComparisonHubJsonLdItem>;
};
