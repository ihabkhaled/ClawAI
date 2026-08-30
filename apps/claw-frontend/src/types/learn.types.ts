import type { LearnTopic } from '@/enums/learn-topic.enum';
import type { Locale } from '@/enums/locale.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

/** One `<h2>` and its prose. Order is the reading order and the anchor order. */
export type LearnSection = {
  /** Anchor id. Stable across locales so a translated page keeps its deep links. */
  id: string;
  heading: string;
  /** One to three paragraphs. Rendered as separate `<p>` elements. */
  paragraphs: readonly [string, ...string[]];
};

export type LearnFaqEntry = {
  question: string;
  answer: string;
};

/**
 * Everything one `/learn/<topic>` page renders, in one locale.
 *
 * SEO copy lives here beside the body copy rather than in the global
 * `PUBLIC_PAGE_SEO_BY_LOCALE`. See ADR-084 and
 * `public-page-seo-registry.constants.ts` for why.
 */
export type LearnTopicContent = {
  seo: PublicPageSeoCopy;
  /** Small label above the `<h1>`. */
  eyebrow: string;
  /** The `<h1>`. Exactly one per page. */
  title: string;
  /** The lede under the heading. Also the fallback meta description. */
  summary: string;
  sections: readonly [LearnSection, ...LearnSection[]];
  faq: readonly [LearnFaqEntry, ...LearnFaqEntry[]];
  /**
   * How ClawAI implements the concept, in one sentence, above the CTA.
   *
   * Kept separate from `sections` so the product claim is always in the same
   * place on every page in the cluster, and so it can be reviewed as a set
   * without reading eighteen bodies.
   */
  productNote: string;
};

export type LearnHubContent = {
  seo: PublicPageSeoCopy;
  eyebrow: string;
  title: string;
  summary: string;
  /** Heading above the topic grid. */
  topicsHeading: string;
  /** One short line per topic on the hub card. */
  cardSummaries: Readonly<Record<LearnTopic, string>>;
};

export type LearnDictionary = {
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
  hub: LearnHubContent;
  topics: Readonly<Record<LearnTopic, LearnTopicContent>>;
};

export type LearnContentByLocale = Readonly<Record<Locale, LearnDictionary>>;

/** A topic with every product-count placeholder already substituted. */
export type ResolvedLearnTopic = {
  seo: PublicPageSeoCopy;
  eyebrow: string;
  title: string;
  summary: string;
  sections: ReadonlyArray<{ id: string; heading: string; paragraphs: readonly string[] }>;
  faq: ReadonlyArray<LearnFaqEntry>;
  productNote: string;
};

export type LearnHubCard = {
  topic: LearnTopic;
  title: string;
  summary: string;
  href: string;
};

export type LearnRelatedLink = {
  path: string;
  href: string;
};

export type LearnSiblingLink = {
  topic: LearnTopic;
  title: string;
  href: string;
};
