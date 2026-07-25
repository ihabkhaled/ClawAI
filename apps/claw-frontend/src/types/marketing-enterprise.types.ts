// Content descriptors for the "ClawAI on your infrastructure" page — the one
// public surface where local/on-premise deployment is discussed, and always in
// an organisation-facing (contact-us) framing rather than as a self-serve plan.
//
// Every human-readable string is an i18n KEY, never literal copy — the section
// components resolve them with t(). The only literals are model FAMILY names,
// which are brand names and identical in every locale.

export type EnterpriseAudienceEntry = {
  /// i18n key for the sector / organisation type.
  nameKey: string;
  /// i18n key for why that sector cannot send data to a third party.
  descKey: string;
};

export type EnterpriseDeploymentBenefit = {
  nameKey: string;
  descKey: string;
};

export type EnterpriseLocalModelFamily = {
  /// Open-weight family label. A brand name — identical in every locale.
  name: string;
  /// i18n key describing what the family is used for in a deployment.
  descKey: string;
};

export type EnterpriseHybridGuardrail = {
  titleKey: string;
  descKey: string;
};

export type EnterpriseEngagementItem = {
  nameKey: string;
  descKey: string;
};

export type EnterpriseStartStep = {
  titleKey: string;
  descKey: string;
};

export type EnterpriseComparisonColumn = {
  /// i18n key for the small audience pill (Individuals / Organisations).
  badgeKey: string;
  titleKey: string;
  subtitleKey: string;
  /// i18n keys for the bullet list, rendered in order.
  pointKeys: readonly string[];
  /// Draws the emphasised treatment on the column this page is about (the
  /// private deployment). Exactly one column sets this.
  isFeatured: boolean;
};

export type EnterpriseComparisonCardProps = {
  column: EnterpriseComparisonColumn;
};

export type EnterpriseHeroProps = {
  /// Review date from the content registry, e.g. '2026-07-24'. Rendered under
  /// the CTAs when present.
  lastReviewed: string;
};
