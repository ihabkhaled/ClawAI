// Descriptors for the public /use-cases marketing page.
//
// Every human-readable string here is an i18n KEY, never literal copy — the
// section components resolve them with t(). The English source and all eight
// translations live under the `marketing.useCasesPage` namespace in the
// locale files.

export type MarketingUseCase = {
  /// Stable React key and in-page anchor fragment, e.g. 'software-development'.
  /// Not user-facing, so it is a literal rather than an i18n key.
  id: string;
  /// i18n key for the use-case name, e.g. 'Software development'.
  titleKey: string;
  /// i18n key describing the problem the reader arrives with.
  problemKey: string;
  /// i18n key describing how ClawAI handles that problem.
  solutionKey: string;
  /// i18n key naming the ClawAI capability the use case leans on.
  capabilityKey: string;
};

/// A single argument for why one subscription across many models beats
/// paying several vendors separately.
export type MarketingUseCaseValuePoint = {
  titleKey: string;
  descKey: string;
};

export type UseCasesHeroSectionProps = {
  /// Review date rendered under the subtitle, sourced from the content
  /// registry. An empty string hides the line entirely.
  lastReviewed: string;
};

/// English fallbacks for <title>/<meta description>. The content-registry
/// entry for this slug is the source of truth once it is PUBLISHED; until
/// then its title/description are empty strings and the page falls back to
/// these.
export type MarketingUseCasesPageFallback = {
  title: string;
  description: string;
  canonicalPath: string;
};
