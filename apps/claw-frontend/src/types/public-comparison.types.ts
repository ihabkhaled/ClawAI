import type { ComparisonDimension } from '@/enums/comparison-dimension.enum';
import type { ComparisonRival } from '@/enums/comparison-rival.enum';

/** One question-and-answer pair, rendered as prose and as FAQPage structured data. */
export type ComparisonFaqEntry = {
  question: string;
  answer: string;
};

/**
 * Everything one comparison page says, for one language.
 *
 * `name` and `vendor` are product names and stay untranslated in every locale —
 * "ChatGPT" is "ChatGPT" in Japanese too. Everything else is real copy.
 */
export type ComparisonRivalContent = {
  name: string;
  vendor: string;
  eyebrow: string;
  intro: string;
  theirStrength: string;
  ourDifference: string;
  chooseRival: string;
  chooseClaw: string;
  cells: Record<ComparisonDimension, string>;
  faq: readonly [ComparisonFaqEntry, ComparisonFaqEntry, ComparisonFaqEntry];
};

/**
 * Page furniture shared by the hub and all five comparison pages.
 *
 * Three of these carry a `{rival}` placeholder rather than being assembled from
 * fragments in the component. Word order is not universal — a prefix-plus-name
 * concatenation that reads correctly in English produces broken grammar in
 * several of the thirteen locales, so the translator gets a whole sentence and
 * decides where the name goes.
 */
export type ComparisonLabels = {
  onThisPage: string;
  atAGlance: string;
  tableCaption: string;
  capabilityColumn: string;
  clawColumn: string;
  strengthTitle: string;
  differenceTitle: string;
  chooseTitle: string;
  chooseRivalLabel: string;
  chooseClawLabel: string;
  faqTitle: string;
  lastReviewed: string;
  independence: string;
  otherComparisons: string;
  startFree: string;
  seePricing: string;
};

export type ComparisonHubContent = {
  eyebrow: string;
  intro: string;
  cardsTitle: string;
  cardCta: string;
  coversTitle: string;
  coversBody: string;
};

/** One language's worth of comparison copy. */
export type ComparisonDictionary = {
  labels: ComparisonLabels;
  hub: ComparisonHubContent;
  dimensionLabels: Record<ComparisonDimension, string>;
  clawCells: Record<ComparisonDimension, string>;
  rivals: Record<ComparisonRival, ComparisonRivalContent>;
};

export type ComparisonPageProps = {
  rival: ComparisonRival;
};

export type ComparisonMatrixRow = {
  dimension: ComparisonDimension;
  label: string;
  claw: string;
  rival: string;
};

export type ComparisonMatrixProps = {
  caption: string;
  capabilityColumn: string;
  clawColumn: string;
  rivalColumn: string;
  rows: readonly ComparisonMatrixRow[];
};

export type ComparisonVerdictProps = {
  title: string;
  clawLabel: string;
  clawBody: string;
  rivalLabel: string;
  rivalBody: string;
};

export type ComparisonFaqProps = {
  title: string;
  entries: readonly ComparisonFaqEntry[];
};

export type ComparisonRailItem = {
  rival: ComparisonRival;
  name: string;
  /** Unlocalised registry path, e.g. `/compare/chatgpt`. */
  path: string;
  /** The same destination with the active locale prefix, e.g. `/fr/compare/chatgpt`. */
  href: string;
  summary: string;
};

export type ComparisonRailProps = {
  title: string;
  items: readonly ComparisonRailItem[];
};

/** A rail item plus its own call to action, for the hub's card grid. */
export type ComparisonHubCardItem = ComparisonRailItem & {
  cta: string;
};

export type ComparisonSectionProps = {
  id: string;
  title: string;
  children: React.ReactNode;
};

export type ComparisonHubCardsProps = {
  items: readonly ComparisonHubCardItem[];
};

export type ComparisonHubPageProps = {
  lastReviewed: string;
};
