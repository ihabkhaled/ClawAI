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
  category: ContentCategory;
  canonicalPath: string;
  lastReviewed: string;
  indexability: Indexability;
  adEligibility: AdEligibility;
  reviewStatus: ContentReviewStatus;
  relatedSlugs: string[];
  structuredDataType: StructuredDataType;
};
