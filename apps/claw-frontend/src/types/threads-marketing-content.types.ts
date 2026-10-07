/** One question-and-answer pair, rendered as prose and as FAQPage structured data. */
export type ThreadsMarketingFaqEntry = {
  question: string;
  answer: string;
};

/** One titled paragraph: a numbered step, a trust guarantee, a use case or an output. */
export type ThreadsMarketingItem = {
  title: string;
  body: string;
};

/**
 * Everything the public Threads page says, for one language.
 *
 * Paths, plan numbers and the model-role counts are deliberately NOT here: they live in
 * `threads-marketing.constants.ts` (paths) or come from the plan catalog, because the same
 * figure written into thirteen translations drifts in thirteen places.
 */
export type ThreadsMarketingDictionary = {
  eyebrow: string;
  title: string;
  intro: string;
  announcementBadge: string;
  announcementTitle: string;
  announcementBody: string;
  createCta: string;
  discoverCta: string;
  howItWorksCta: string;
  whatTitle: string;
  whatParagraphs: readonly string[];
  stepsTitle: string;
  stepsIntro: string;
  steps: readonly ThreadsMarketingItem[];
  trustTitle: string;
  trustIntro: string;
  trust: readonly ThreadsMarketingItem[];
  outputsTitle: string;
  outputs: readonly ThreadsMarketingItem[];
  useCasesTitle: string;
  useCases: readonly ThreadsMarketingItem[];
  plansTitle: string;
  plansBody: string;
  faqTitle: string;
  faq: readonly ThreadsMarketingFaqEntry[];
  closingTitle: string;
  closingBody: string;
};
