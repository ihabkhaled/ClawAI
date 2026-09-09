import type { Locale } from '@/enums/locale.enum';
import type { ModelFamilyPair } from '@/enums/model-family-pair.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

export type CompareModelsSection = {
  id: string;
  heading: string;
  paragraphs: readonly [string, ...string[]];
};

export type CompareModelsFaqEntry = {
  question: string;
  answer: string;
};

/**
 * Everything one `/compare/models/<pair>` page renders, in one locale.
 *
 * SEO copy lives here beside body copy — see ADR-084 and
 * `public-page-seo-registry.constants.ts`. Unlike `/compare/<rival>`, this
 * page never declares a winner between the two named families — it explains
 * how ClawAI's own router chooses between them (§8.2 of the SEO content
 * architecture doc).
 */
export type CompareModelsPairContent = {
  seo: PublicPageSeoCopy;
  eyebrow: string;
  title: string;
  summary: string;
  sections: readonly [CompareModelsSection, ...CompareModelsSection[]];
  faq: readonly [CompareModelsFaqEntry, ...CompareModelsFaqEntry[]];
  /**
   * How ClawAI routes between the two families for this pair, in one
   * sentence, above the CTA. Always in the same place across the cluster so
   * the set is reviewable for an implied winner.
   */
  productNote: string;
  /**
   * The "confirm the live catalog before choosing a plan" qualifier (§8.1
   * of the SEO content architecture doc), rendered next to the pricing link
   * on every page in this cluster.
   */
  catalogDisclaimer: string;
};

export type CompareModelsHubContent = {
  seo: PublicPageSeoCopy;
  eyebrow: string;
  title: string;
  summary: string;
  pairsHeading: string;
  cardSummaries: Readonly<Record<ModelFamilyPair, string>>;
};

export type CompareModelsDictionary = {
  labels: {
    onThisPage: string;
    faqTitle: string;
    relatedTitle: string;
    lastReviewed: string;
    backToHub: string;
    ctaTitle: string;
    ctaBody: string;
    startFree: string;
    seeFeatures: string;
    /** Link text to `/pricing` inside the disclaimer. */
    seePricing: string;
  };
  hub: CompareModelsHubContent;
  pairs: Readonly<Record<ModelFamilyPair, CompareModelsPairContent>>;
};

export type CompareModelsContentByLocale = Readonly<Record<Locale, CompareModelsDictionary>>;

export type ResolvedCompareModelsPair = CompareModelsPairContent;

export type CompareModelsHubCard = {
  pair: ModelFamilyPair;
  title: string;
  summary: string;
  href: string;
};

export type CompareModelsRelatedLink = {
  path: string;
  href: string;
};

export type CompareModelsSiblingLink = {
  pair: ModelFamilyPair;
  title: string;
  href: string;
};
