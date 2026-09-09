import type { Locale } from '@/enums/locale.enum';
import type { PromptGuideTopic } from '@/enums/prompt-guide-topic.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

export type PromptGuideSection = {
  id: string;
  heading: string;
  paragraphs: readonly [string, ...string[]];
};

export type PromptGuideFaqEntry = {
  question: string;
  answer: string;
};

/**
 * Everything one `/prompts/<topic>` page renders, in one locale. Mirrors
 * `ModelFitTaskContent` in shape (see ADR-084), swapping the model-fit
 * catalog disclaimer for a `productNote` only — this cluster makes no
 * per-model claim that needs a live-catalog qualifier.
 */
export type PromptGuideTopicContent = {
  seo: PublicPageSeoCopy;
  eyebrow: string;
  title: string;
  summary: string;
  sections: readonly [PromptGuideSection, ...PromptGuideSection[]];
  faq: readonly [PromptGuideFaqEntry, ...PromptGuideFaqEntry[]];
  /**
   * How ClawAI fits into this technique in one sentence, above the CTA.
   * Always in the same place across the cluster so the set is reviewable.
   */
  productNote: string;
};

export type PromptGuideHubContent = {
  seo: PublicPageSeoCopy;
  eyebrow: string;
  title: string;
  summary: string;
  topicsHeading: string;
  cardSummaries: Readonly<Record<PromptGuideTopic, string>>;
};

export type PromptGuideDictionary = {
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
  };
  hub: PromptGuideHubContent;
  topics: Readonly<Record<PromptGuideTopic, PromptGuideTopicContent>>;
};

export type PromptGuideContentByLocale = Readonly<Record<Locale, PromptGuideDictionary>>;

export type ResolvedPromptGuideTopic = PromptGuideTopicContent;

export type PromptGuideHubCard = {
  topic: PromptGuideTopic;
  title: string;
  summary: string;
  href: string;
};

export type PromptGuideRelatedLink = {
  path: string;
  href: string;
};

export type PromptGuideSiblingLink = {
  topic: PromptGuideTopic;
  title: string;
  href: string;
};
