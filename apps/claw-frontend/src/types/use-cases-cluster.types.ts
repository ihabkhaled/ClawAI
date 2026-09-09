import type { Locale } from '@/enums/locale.enum';
import type { UseCaseTask } from '@/enums/use-case-task.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

export type UseCaseSection = {
  id: string;
  heading: string;
  paragraphs: readonly [string, ...string[]];
};

export type UseCaseFaqEntry = {
  question: string;
  answer: string;
};

/**
 * Everything one `/use-cases/<task>` page renders, in one locale. SEO copy
 * lives here beside body copy — see ADR-084 and
 * `public-page-seo-registry.constants.ts`.
 */
export type UseCaseTaskContent = {
  seo: PublicPageSeoCopy;
  eyebrow: string;
  title: string;
  summary: string;
  sections: readonly [UseCaseSection, ...UseCaseSection[]];
  faq: readonly [UseCaseFaqEntry, ...UseCaseFaqEntry[]];
  /**
   * The ClawAI feature or routing mode this task leans on, in one sentence,
   * above the CTA. Always in the same place across the cluster so the set
   * is reviewable.
   */
  productNote: string;
};

/**
 * The hub's own SEO copy is NOT here — the existing `use-cases` registry
 * entry already owns it (F4: same URL, no redirect, no lost equity), so
 * duplicating it in this dictionary would create a second source of truth.
 * Only the new task-card copy this cluster adds to the hub lives here.
 */
export type UseCasesHubContent = {
  tasksHeading: string;
  tasksIntro: string;
  cardSummaries: Readonly<Record<UseCaseTask, string>>;
};

export type UseCasesClusterDictionary = {
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
  hub: UseCasesHubContent;
  tasks: Readonly<Record<UseCaseTask, UseCaseTaskContent>>;
};

export type UseCasesClusterContentByLocale = Readonly<Record<Locale, UseCasesClusterDictionary>>;

export type UseCaseHubCard = {
  task: UseCaseTask;
  title: string;
  summary: string;
  href: string;
};

export type UseCaseRelatedLink = {
  path: string;
  href: string;
};

export type UseCaseSiblingLink = {
  task: UseCaseTask;
  title: string;
  href: string;
};
