// Mirrors workspace/constants/sync-cadence.constants.ts's orphan-recovery
// cadence — same rationale, applied to chain runs instead of sync runs.
export const CHAIN_ORPHAN_RUN_RECOVERY_CRON = '*/90 * * * * *';
export const CHAIN_ORPHAN_RUN_MAX_AGE_MS = 15 * 60 * 1000;
