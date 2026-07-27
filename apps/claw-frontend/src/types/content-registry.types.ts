import type {
  AdEligibility,
  ContentCategory,
  ContentLifecycleStatus,
  ContentReviewStatus,
  Indexability,
  StructuredDataType,
} from '@/enums';
import type { Locale } from '@/enums/locale.enum';

export type ContentRegistryEntry = {
  slug: string;
  locale: Locale;
  status: ContentLifecycleStatus;
  title: string;
  description: string;
  keywords: readonly string[];
  category: ContentCategory;
  canonicalPath: string;
  lastReviewed: string;
  indexability: Indexability;
  adEligibility: AdEligibility;
  reviewStatus: ContentReviewStatus;
  relatedSlugs: readonly string[];
  structuredDataType: StructuredDataType;
};

export type LocalizedContentRegistryEntry = ContentRegistryEntry & {
  path: string;
  metadata: {
    title: string;
    description: string;
    keywords: readonly string[];
    lastReviewed: string;
  };
};

export type LocalizedContentMetadata = {
  title: string;
  description: string;
  keywords: readonly string[];
  lastReviewed: string;
  reviewStatus: ContentReviewStatus;
  indexability: Indexability;
};

export type PublicContentDefinition = {
  slug: string;
  category: ContentCategory;
  path: string;
  status: ContentLifecycleStatus;
  adEligibility: AdEligibility;
  structuredDataType: StructuredDataType;
  relatedSlugs: readonly string[];
  locales: Partial<Record<Locale, LocalizedContentMetadata>>;
};

export type PublicPageSeoCopy = {
  title: string;
  description: string;
  keywords: readonly [string, string, string, ...string[]];
};
