// Descriptors for the public /features marketing page.
//
// Every human-readable string below is an i18n KEY, never literal copy — the
// section components resolve them with t() so all nine locales stay in sync.
// The only literals are brand names (model families, connector vendors) and
// file-format tokens, which are identical in every locale.

export type MarketingFeaturesHeroProps = {
  /// Review date from the content registry, e.g. '2026-07-25'. Empty string
  /// hides the reviewed-on line.
  lastReviewed: string;
};

export type MarketingFeatureItem = {
  /// i18n key for the short label.
  nameKey: string;
  /// i18n key for the supporting sentence.
  descKey: string;
};

export type MarketingFeatureModelFamily = {
  /// Vendor/family label. A brand name — identical in every locale.
  name: string;
  /// Representative models a subscriber can reach on a paid plan.
  models: readonly string[];
  /// i18n key describing what this family is best at.
  descKey: string;
};

export type MarketingFeatureConnector = {
  /// Connector vendor label. A brand name — identical in every locale.
  name: string;
  /// i18n key describing what ClawAI reads from / does with this connector.
  descKey: string;
};
