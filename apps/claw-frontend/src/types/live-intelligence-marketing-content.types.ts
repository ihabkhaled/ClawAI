/** One question-and-answer pair, rendered as prose and as FAQPage structured data. */
export type LiveIntelligenceMarketingFaqEntry = {
  question: string;
  answer: string;
};

/** One titled paragraph: a step, a feature, a mode or a limit. */
export type LiveIntelligenceMarketingItem = {
  title: string;
  body: string;
};

/**
 * Everything the public Live Intelligence page says, for one language.
 *
 * Paths and plan numbers are deliberately NOT here: they live in
 * `live-intelligence-marketing.constants.ts`, because the same figure written into thirteen
 * translations drifts in thirteen places.
 */
export type LiveIntelligenceMarketingDictionary = {
  eyebrow: string;
  title: string;
  intro: string;
  openCta: string;
  pricingCta: string;
  howItWorksCta: string;
  whatTitle: string;
  whatParagraphs: readonly string[];
  stepsTitle: string;
  stepsIntro: string;
  steps: readonly LiveIntelligenceMarketingItem[];
  featuresTitle: string;
  features: readonly LiveIntelligenceMarketingItem[];
  modesTitle: string;
  modesIntro: string;
  modes: readonly LiveIntelligenceMarketingItem[];
  sourcesTitle: string;
  sourcesIntro: string;
  sources: readonly LiveIntelligenceMarketingItem[];
  plansTitle: string;
  plansIntro: string;
  /** The unit shown after each plan's number, for example "free minutes a month". */
  planMinutesUnit: string;
  /** The label for the highest tier row, for example "Pro and above". */
  planProAndAbove: string;
  plansBody: string;
  faqTitle: string;
  faq: readonly LiveIntelligenceMarketingFaqEntry[];
  closingTitle: string;
  closingBody: string;
};
