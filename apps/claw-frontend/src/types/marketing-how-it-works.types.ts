// Descriptors for the dedicated public "How It Works" marketing page.
//
// Every human-readable string here is an i18n KEY under the
// `marketing.howItWorksPage.` namespace — never literal copy. The section
// components resolve them with t(). The only literals are brand and model
// names, which are identical in every locale.

/// A numbered step in the end-to-end user journey (sign up → allowance).
export type HowItWorksJourneyStep = {
  titleKey: string;
  descKey: string;
};

/// A vendor family a subscriber can reach from the hosted app. `name` and
/// `models` are brand names and stay identical in every locale.
export type HowItWorksModelFamily = {
  name: string;
  models: readonly string[];
  strengthKey: string;
};

/// Generic name + description pair reused by the routing-class, orchestration,
/// context-layer, transparency and allowance lists. One shape keeps the
/// section components identical instead of five near-duplicate types.
export type HowItWorksNamedEntry = {
  nameKey: string;
  descKey: string;
};

export type HowItWorksHeroProps = {
  /// Rendered under the CTA row, e.g. 'Last reviewed 2026-07-25'.
  lastReviewed: string;
};
