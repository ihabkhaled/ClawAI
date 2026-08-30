/**
 * Whether a public page belongs in the RSS/Atom feeds.
 *
 * A feed item is a notification. Subscribing to ClawAI and being told about the
 * cookie policy is a broken promise about what the feed is for — and that is
 * exactly what shipped: every indexable registry page went into `/rss.xml`,
 * `/feed.xml` and `/feeds/topics.xml`, including `/terms`, `/privacy`,
 * `/cookies`, `/acceptable-use` and `/contact`.
 *
 * This sits on the definition rather than being derived from `ContentCategory`
 * because the registry already answers "which surfaces does this page appear
 * on" per definition — `indexability`, `adEligibility`, `structuredDataType`.
 * Keying it on category instead would mean two pages in the same category could
 * never differ, and would add a second way to express the same kind of fact.
 */
export enum FeedEligibility {
  /** Content with genuine publication semantics: it is news to a subscriber. */
  PUBLISHABLE = 'PUBLISHABLE',
  /** Real, indexable, linked — but not an update anyone subscribed for. */
  NOT_PUBLISHABLE = 'NOT_PUBLISHABLE',
}
