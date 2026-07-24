// Run-once seeding history. A seeder is identified by (name, version); its
// checksum is recorded so an edited-but-not-reversioned seeder aborts loudly
// instead of silently re-applying different data to production.
export enum SeedExecutionStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  // Recorded when the on-disk checksum no longer matches the completed run.
  CHECKSUM_MISMATCH = 'CHECKSUM_MISMATCH',
}
