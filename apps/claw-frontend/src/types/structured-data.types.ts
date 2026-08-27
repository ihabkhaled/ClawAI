import type { ComparisonFaqEntry } from '@/types/public-comparison.types';

export type JsonLdObject = Record<string, unknown>;

export type PublicPageJsonLdInput = {
  name: string;
  description: string;
  canonicalUrl: string;
  language: string;
  lastReviewed: string;
};

/**
 * Structured data for the VS Code extension.
 *
 * `SoftwareApplication` rather than `WebPage`: the subject of this page is a
 * downloadable product with an install location, and that is the vocabulary a
 * search engine already understands for one.
 */
export type CodingAgentJsonLdInput = Omit<PublicPageJsonLdInput, 'lastReviewed'> & {
  downloadUrl: string;
};

/** Any page whose body is a question-and-answer list. */
export type PublicFaqJsonLdInput = Omit<PublicPageJsonLdInput, 'lastReviewed'> & {
  faq: ReadonlyArray<ComparisonFaqEntry>;
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
