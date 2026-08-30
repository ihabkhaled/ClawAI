import type { IntegrationTopic } from '@/enums/integration-topic.enum';
import type { Locale } from '@/enums/locale.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

export type IntegrationSection = {
  id: string;
  heading: string;
  paragraphs: readonly [string, ...string[]];
};

export type IntegrationFaqEntry = {
  question: string;
  answer: string;
};

/**
 * Everything one `/integrations/<connector>` page renders, in one locale.
 *
 * SEO copy lives here beside body copy — see ADR-084 and
 * `public-page-seo-registry.constants.ts`.
 */
export type IntegrationTopicContent = {
  seo: PublicPageSeoCopy;
  eyebrow: string;
  title: string;
  summary: string;
  sections: readonly [IntegrationSection, ...IntegrationSection[]];
  faq: readonly [IntegrationFaqEntry, ...IntegrationFaqEntry[]];
  /**
   * How to think about ClawAI's connector, in one sentence, above the CTA.
   * Always in the same place across the cluster so the set is reviewable.
   */
  productNote: string;
};

export type IntegrationHubContent = {
  seo: PublicPageSeoCopy;
  eyebrow: string;
  title: string;
  summary: string;
  topicsHeading: string;
  cardSummaries: Readonly<Record<IntegrationTopic, string>>;
};

export type IntegrationsDictionary = {
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
    /** Section heading over the read/write capability summary. */
    capabilitiesHeading: string;
    readLabel: string;
    writeLabel: string;
    syncLabel: string;
    realTimeLabel: string;
    pollBasedLabel: string;
  };
  hub: IntegrationHubContent;
  topics: Readonly<Record<IntegrationTopic, IntegrationTopicContent>>;
};

export type IntegrationsContentByLocale = Readonly<Record<Locale, IntegrationsDictionary>>;

/** A connector topic with every product-count placeholder already substituted. */
export type ResolvedIntegrationTopic = {
  seo: PublicPageSeoCopy;
  eyebrow: string;
  title: string;
  summary: string;
  sections: ReadonlyArray<{ id: string; heading: string; paragraphs: readonly string[] }>;
  faq: ReadonlyArray<IntegrationFaqEntry>;
  productNote: string;
};

export type IntegrationHubCard = {
  topic: IntegrationTopic;
  title: string;
  summary: string;
  href: string;
};

export type IntegrationRelatedLink = {
  path: string;
  href: string;
};

export type IntegrationSiblingLink = {
  topic: IntegrationTopic;
  title: string;
  href: string;
};
