/** The two stored columns that describe a ban. `bannedUntil: null` with `bannedAt` set is a lifetime ban. */
export interface BanColumns {
  bannedAt: Date | null;
  bannedUntil: Date | null;
}

/**
 * NONE: never banned or cleared. ACTIVE: refuse the account. EXPIRED: a timed
 * ban whose end has passed - the account is usable and the stale columns are
 * cleared lazily by whoever notices.
 */
export type BanState =
  | { status: 'NONE' }
  | { status: 'ACTIVE'; permanent: boolean; until: Date | null }
  | { status: 'EXPIRED' };

/** Where a sign-up came from. Both null when unknown. Personal data: admin-only. */
export interface RegistrationOrigin {
  ip: string | null;
  countryCode: string | null;
}

/** The ban columns of a user row; absent or null both mean "not banned". */
export interface BannableUser {
  id: string;
  bannedAt?: Date | null;
  bannedUntil?: Date | null;
}
