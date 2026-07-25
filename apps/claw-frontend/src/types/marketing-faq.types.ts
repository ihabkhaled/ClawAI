// FAQ page content descriptors. Every field holds an i18n KEY reference
// (never literal copy) so the section components resolve them through t().
// The English source and all translations live under the
// `marketing.faqPage` namespace in the locale files.
export type MarketingFaqQuestion = {
  // Stable slug used as the React key and as the anchor target for deep links.
  id: string;
  questionKey: string;
  answerKey: string;
};

export type MarketingFaqCategory = {
  // Stable slug used as the section anchor (`#getting-started`) and React key.
  id: string;
  titleKey: string;
  descriptionKey: string;
  questions: ReadonlyArray<MarketingFaqQuestion>;
};

export type MarketingFaqCategoryBlockProps = {
  category: MarketingFaqCategory;
};

export type MarketingFaqHeroProps = {
  // Registry review date, rendered under the subtitle. Empty string hides it.
  lastReviewed: string;
};
