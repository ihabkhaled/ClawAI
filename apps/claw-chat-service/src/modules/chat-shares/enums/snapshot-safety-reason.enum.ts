/**
 * Why a snapshot was not approved for indexing.
 *
 * Machine codes the frontend maps to i18n keys. Deliberately coarse: a finer
 * code like `AWS_ACCESS_KEY_DETECTED` would tell an attacker which detector
 * fired, which is a hint about how to evade it.
 */
export enum SnapshotSafetyReason {
  POSSIBLE_SECRET = 'POSSIBLE_SECRET',
  POSSIBLE_PII = 'POSSIBLE_PII',
  INSUFFICIENT_CONTENT = 'INSUFFICIENT_CONTENT',
}
