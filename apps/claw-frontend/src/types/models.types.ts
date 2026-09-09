import type { ModelCostBand } from '@/constants/model-facts.constants';
import type { Locale } from '@/enums/locale.enum';
import type { ModelProviderPage } from '@/enums/model-provider-page.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

export type ModelSection = {
  id: string;
  heading: string;
  paragraphs: readonly [string, ...string[]];
};

export type ModelFaqEntry = {
  question: string;
  answer: string;
};

/**
 * Everything one `/models/<provider>` page renders, in one locale.
 *
 * SEO copy lives here beside body copy — see ADR-084 and
 * `public-page-seo-registry.constants.ts`.
 */
export type ModelProviderContent = {
  seo: PublicPageSeoCopy;
  eyebrow: string;
  title: string;
  summary: string;
  sections: readonly [ModelSection, ...ModelSection[]];
  faq: readonly [ModelFaqEntry, ...ModelFaqEntry[]];
  /**
   * How ClawAI routes to this provider, in one sentence, above the CTA.
   * Always in the same place across the cluster so the set is reviewable.
   */
  productNote: string;
  /**
   * The "confirm the live catalog before choosing a plan" qualifier, rendered
   * next to the model list on every page that names a model (§8.1). Present
   * even on `/models/local-ai`, which names no specific models, because it
   * still links to `/pricing` for allowance questions.
   */
  catalogDisclaimer: string;
};

export type ModelHubContent = {
  seo: PublicPageSeoCopy;
  eyebrow: string;
  title: string;
  summary: string;
  topicsHeading: string;
  cardSummaries: Readonly<Record<ModelProviderPage, string>>;
};

export type ModelsDictionary = {
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
    /** Section heading over the model catalog block. */
    catalogHeading: string;
    /** Label above the cost-band value for a listed model. */
    costBandLabel: string;
    /** Link text to `/pricing` inside the disclaimer. */
    seePricing: string;
    /** Label before the vendor citation link, e.g. "Source". */
    sourceLabel: string;
    costBandNames: Readonly<Record<ModelCostBand, string>>;
  };
  hub: ModelHubContent;
  providers: Readonly<Record<ModelProviderPage, ModelProviderContent>>;
};

export type ModelsContentByLocale = Readonly<Record<Locale, ModelsDictionary>>;

export type ResolvedModelProvider = ModelProviderContent;

export type ModelHubCard = {
  provider: ModelProviderPage;
  title: string;
  summary: string;
  href: string;
};

export type ModelRelatedLink = {
  path: string;
  href: string;
};

export type ModelSiblingLink = {
  provider: ModelProviderPage;
  title: string;
  href: string;
};
