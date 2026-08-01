// Marketing-surface descriptors for the subscription product.
//
// Every human-readable string is an i18n KEY, never literal copy — the section
// components resolve them with t(). The only literals here are brand names,
// numbers and currency symbols, which are identical in every locale.

export type MarketingModelFamily = {
  /// Vendor/family label. A brand name — identical in every locale.
  name: string;
  /// Representative models a subscriber can reach.
  models: readonly string[];
  /// i18n key describing what this family is good at.
  strengthKey: string;
};

export type MarketingNewestModel = {
  id: string;
  label: string;
  provider: string;
};

export type MarketingPlanTier = {
  /// Plan slug, matching the billing catalog (free, starter, plus, …).
  slug: string;
  /// i18n key for the display name.
  nameKey: string;
  /// i18n key for the one-line positioning.
  taglineKey: string;
  /// Price in whole USD. Numbers are locale-identical; formatting is the
  /// component's job.
  monthlyUsd: number;
  /// Yearly price in whole USD, or null when the tier has no yearly option.
  yearlyUsd: number | null;
  /// Human-facing daily allowance, already abbreviated (e.g. '5K', '1.5M').
  dailyTokens: string;
  monthlyTokens: string;
  /// i18n keys for the feature bullets shown on the card.
  highlightKeys: readonly string[];
  /// Draws the "most popular" treatment. Exactly one tier sets this.
  isFeatured: boolean;
};

export type MarketingFaqEntry = {
  questionKey: string;
  answerKey: string;
};

export type MarketingPageSection = {
  titleKey: string;
  bodyKey: string;
};
