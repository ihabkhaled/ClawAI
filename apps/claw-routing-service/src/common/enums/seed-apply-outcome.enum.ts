/**
 * Result of applying a versioned seed.
 *
 * NOTHING_TO_SEED is distinct from ALREADY_APPLIED on purpose: the first means
 * there was no derivable payload at all, the second means the ledger already
 * records this exact version. Collapsing them would hide an empty registry
 * behind a reassuring "already done".
 */
export enum SeedApplyOutcome {
  APPLIED = 'APPLIED',
  ALREADY_APPLIED = 'ALREADY_APPLIED',
  CHECKSUM_MISMATCH = 'CHECKSUM_MISMATCH',
  NOTHING_TO_SEED = 'NOTHING_TO_SEED',
}
