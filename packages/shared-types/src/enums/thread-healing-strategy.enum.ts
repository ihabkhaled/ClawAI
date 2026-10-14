/**
 * What the generation service changed before trying a failed step again. The value is also the
 * step code the owner's log carries, so the UI translates it (ADR-181). `FALLBACK_USED` is the
 * pre-existing code for a swap to a model the owner chose as a backup.
 */
export enum ThreadHealingStrategy {
  BACKOFF_RETRY = 'HEAL_BACKOFF_RETRY',
  STRICT_PROMPT = 'HEAL_STRICT_PROMPT',
  JSON_REPAIR = 'HEAL_JSON_REPAIR',
  RAISE_OUTPUT_LIMIT = 'HEAL_RAISE_OUTPUT_LIMIT',
  COMPACT_OUTPUT = 'HEAL_COMPACT_OUTPUT',
  LOWER_OUTPUT_LIMIT = 'HEAL_LOWER_OUTPUT_LIMIT',
  SHRINK_SOURCE = 'HEAL_SHRINK_SOURCE',
  TEAM_FALLBACK = 'FALLBACK_USED',
  CROSS_PROVIDER = 'HEAL_CROSS_PROVIDER',
  SAFE_DEFAULT = 'HEAL_SAFE_DEFAULT',
}
