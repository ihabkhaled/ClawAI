/**
 * Which `RouterConfigurationSnapshot` shape a routing lab case runs against.
 *
 * `DEFAULT` is the healthy, fully-resolved 7-entry chain almost every case
 * uses. The rest exist only to reach the config-level decline paths and the
 * trigger-gated walk, which the healthy chain cannot exercise by itself.
 */
export enum RoutingLabConfigurationVariant {
  /** Healthy, published, enabled, every entry resolved and ACTIVE. */
  DEFAULT = 'DEFAULT',
  /** `findPublishedSnapshot` returns null. */
  NO_PUBLISHED_CONFIGURATION = 'NO_PUBLISHED_CONFIGURATION',
  /** Published but `enabled: false`. */
  CONFIGURATION_DISABLED = 'CONFIGURATION_DISABLED',
  /** Published and enabled, but every entry is an unresolved alias. */
  ALL_ENTRIES_UNRESOLVED = 'ALL_ENTRIES_UNRESOLVED',
  /** `totalDeadlineMs` is already spent before the first attempt. */
  SHORT_DEADLINE = 'SHORT_DEADLINE',
  /** `maxAttempts` is lower than the chain's entry count. */
  LOW_MAX_ATTEMPTS = 'LOW_MAX_ATTEMPTS',
  /** Adds one entry reachable only via a non-empty `triggers` list. */
  TRIGGER_GATED_FALLBACK = 'TRIGGER_GATED_FALLBACK',
}
