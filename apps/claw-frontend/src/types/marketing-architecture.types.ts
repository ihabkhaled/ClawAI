// Descriptors for the public /architecture marketing page.
//
// Every human-readable string below is an i18n KEY, never literal copy — the
// section components resolve them with t() so all nine locales stay in sync.
// The only literals are infrastructure brand names (PostgreSQL, MongoDB,
// RabbitMQ, Redis), which are identical in every locale.

export type MarketingArchitectureItem = {
  /// i18n key for the short label.
  nameKey: string;
  /// i18n key for the supporting sentence.
  descKey: string;
};

export type MarketingArchitectureStat = {
  /// i18n key for the headline figure (kept translatable because some values
  /// are phrases such as "one per service", not bare numerals).
  valueKey: string;
  /// i18n key for the sentence explaining what the figure counts.
  labelKey: string;
};

export type MarketingArchitectureStep = {
  /// i18n key for the step heading.
  titleKey: string;
  /// i18n key for the sentence describing what happens in this step.
  descKey: string;
};

export type MarketingArchitectureStore = {
  /// Datastore label. A product brand name — identical in every locale, so it
  /// is a literal rather than an i18n key.
  name: string;
  /// i18n key describing what this store is used for.
  descKey: string;
};

export type MarketingArchitectureService = {
  /// i18n key for the service name as presented to readers.
  nameKey: string;
  /// i18n key describing what this service owns.
  descKey: string;
  /// Datastore this service owns. A product brand name — identical in every
  /// locale, so it is a literal rather than an i18n key.
  store: string;
};
