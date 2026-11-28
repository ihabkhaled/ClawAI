/** Why a device hash was marked. Stored on the mark and shown to administrators only. */
export enum DeviceMarkReason {
  /** An administrator banned the account for life. */
  ADMIN_LIFETIME_BAN = 'ADMIN_LIFETIME_BAN',
  /** The account was already banned for life when this feature shipped (seeded backfill). */
  BACKFILL_LIFETIME_BAN = 'BACKFILL_LIFETIME_BAN',
}
