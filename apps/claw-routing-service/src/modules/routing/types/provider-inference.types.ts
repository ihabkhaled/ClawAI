/**
 * A single rule consumed by `RoutingManager.inferProvider`. A model name
 * matches a rule when EITHER:
 *   - one of the `startsWith` prefixes matches (lower-cased), OR
 *   - one of the `includes` substrings appears (lower-cased).
 */
export interface ProviderInferenceRule {
  provider: string;
  startsWith?: readonly string[];
  includes?: readonly string[];
}
