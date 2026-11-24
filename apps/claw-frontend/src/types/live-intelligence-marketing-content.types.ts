import type { LiveMarketingPlatformGroup } from '@/enums/live-marketing-platform-group.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

/** One question-and-answer pair, rendered as prose and as FAQPage structured data. */
export type LiveIntelligenceMarketingFaqEntry = {
  question: string;
  answer: string;
};

/** One titled paragraph: a step, an outcome, a mode, a limit or a caption. */
export type LiveIntelligenceMarketingItem = {
  title: string;
  body: string;
};

/** One row of the "two ways to use it" comparison table. */
export type LiveIntelligenceMarketingWaysRow = {
  label: string;
  live: string;
  summary: string;
};

/** The copy for one platform group on the platforms page. */
export type LiveIntelligenceMarketingGroupCopy = {
  title: string;
  body: string;
};

/** Everything the platforms page (`/features/live-intelligence/platforms`) says, for one language. */
export type LiveIntelligencePlatformsPageDictionary = {
  eyebrow: string;
  title: string;
  intro: string;
  openCta: string;
  backCta: string;
  groupsTitle: string;
  groupsIntro: string;
  groups: Readonly<Record<LiveMarketingPlatformGroup, LiveIntelligenceMarketingGroupCopy>>;
  /** The tag shown on a platform that supports live streams. */
  liveTag: string;
  /** The tag shown on a platform that supports recorded videos. */
  videoTag: string;
  supportTitle: string;
  supportIntro: string;
  /** Three items: live streams, recorded videos, one-click summary. */
  support: readonly LiveIntelligenceMarketingItem[];
  limitsTitle: string;
  limits: readonly LiveIntelligenceMarketingItem[];
  faqTitle: string;
  faq: readonly LiveIntelligenceMarketingFaqEntry[];
  closingTitle: string;
  closingBody: string;
};

/**
 * Everything the public Live & Video Intelligence pages say, for one language.
 *
 * Paths, media files and the platform list are deliberately NOT here: they live in
 * `live-intelligence-marketing*.constants.ts`, because the same fact written into thirteen
 * translations drifts in thirteen places. Prices and free-minute counts are admin policy and
 * are never written into this copy.
 */
export type LiveIntelligenceMarketingDictionary = {
  eyebrow: string;
  title: string;
  intro: string;
  openCta: string;
  signUpCta: string;
  howItWorksCta: string;
  videosTitle: string;
  videosIntro: string;
  /** Two items, in the order of `LIVE_INTELLIGENCE_MARKETING_VIDEOS`: promo, then demo. */
  videos: readonly LiveIntelligenceMarketingItem[];
  stepsTitle: string;
  stepsIntro: string;
  /** Four steps: paste, choose, watch or summarize, export. */
  steps: readonly LiveIntelligenceMarketingItem[];
  screenshotsTitle: string;
  screenshotsIntro: string;
  /** Three items, in the order of `LIVE_INTELLIGENCE_MARKETING_SCREENSHOTS`. Title is the alt text. */
  screenshots: readonly LiveIntelligenceMarketingItem[];
  outcomesTitle: string;
  outcomes: readonly LiveIntelligenceMarketingItem[];
  waysTitle: string;
  waysIntro: string;
  /** The two ways: live analysis, then one-click summary. */
  ways: readonly LiveIntelligenceMarketingItem[];
  waysTableCaption: string;
  waysTableAspect: string;
  waysTableLive: string;
  waysTableSummary: string;
  waysRows: readonly LiveIntelligenceMarketingWaysRow[];
  modesTitle: string;
  modesIntro: string;
  modes: readonly LiveIntelligenceMarketingItem[];
  researchNote: string;
  languagesTitle: string;
  languagesParagraphs: readonly string[];
  platformsTitle: string;
  platformsBody: string;
  platformsCta: string;
  limitsTitle: string;
  limits: readonly LiveIntelligenceMarketingItem[];
  faqTitle: string;
  faq: readonly LiveIntelligenceMarketingFaqEntry[];
  closingTitle: string;
  closingBody: string;
  platformsPage: LiveIntelligencePlatformsPageDictionary;
};

/** SEO copy for the two public pages, for one language. */
export type LiveIntelligenceMarketingSeo = {
  overview: PublicPageSeoCopy;
  platforms: PublicPageSeoCopy;
};
