import type { Locale } from '@/enums/locale.enum';
import type { ModelFitTask } from '@/enums/model-fit-task.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

export type ModelFitSection = {
  id: string;
  heading: string;
  paragraphs: readonly [string, ...string[]];
};

export type ModelFitFaqEntry = {
  question: string;
  answer: string;
};

/**
 * Everything one `/model-fit/<task>` page renders, in one locale.
 *
 * SEO copy lives here beside body copy — see ADR-084 and
 * `public-page-seo-registry.constants.ts`.
 */
export type ModelFitTaskContent = {
  seo: PublicPageSeoCopy;
  eyebrow: string;
  title: string;
  summary: string;
  sections: readonly [ModelFitSection, ...ModelFitSection[]];
  faq: readonly [ModelFitFaqEntry, ...ModelFitFaqEntry[]];
  /**
   * How ClawAI routes to a fitting model for this task, in one sentence,
   * above the CTA. Always in the same place across the cluster so the set
   * is reviewable.
   */
  productNote: string;
  /**
   * The "confirm the live catalog before choosing a plan" qualifier (§8.1
   * of the SEO content architecture doc), rendered next to the pricing link
   * on every page in this cluster, including the ones that name no single
   * model.
   */
  catalogDisclaimer: string;
};

export type ModelFitHubContent = {
  seo: PublicPageSeoCopy;
  eyebrow: string;
  title: string;
  summary: string;
  topicsHeading: string;
  cardSummaries: Readonly<Record<ModelFitTask, string>>;
};

export type ModelFitDictionary = {
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
  hub: ModelFitHubContent;
  tasks: Readonly<Record<ModelFitTask, ModelFitTaskContent>>;
};

export type ModelFitContentByLocale = Readonly<Record<Locale, ModelFitDictionary>>;

export type ResolvedModelFitTask = ModelFitTaskContent;

export type ModelFitHubCard = {
  task: ModelFitTask;
  title: string;
  summary: string;
  href: string;
};

export type ModelFitRelatedLink = {
  path: string;
  href: string;
};

export type ModelFitSiblingLink = {
  task: ModelFitTask;
  title: string;
  href: string;
};
