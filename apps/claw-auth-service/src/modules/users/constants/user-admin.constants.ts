/** Refusal codes the frontend translates (ADR-200). Never rename: they are a wire contract. */
export const ACCOUNT_BANNED_CODE = 'ACCOUNT_BANNED';
export const CANNOT_BAN_SELF_CODE = 'CANNOT_BAN_SELF';
export const USER_NOT_BANNED_CODE = 'USER_NOT_BANNED';
export const CANNOT_SET_OWN_PASSWORD_CODE = 'CANNOT_SET_OWN_PASSWORD';

/** Seen within this long ago = "online now". */
export const PRESENCE_ONLINE_WINDOW_MS = 5 * 60 * 1000;
/** Seen within this long ago = "active in the last 24 hours". */
export const PRESENCE_ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;
/** lastSeenAt is written at most once per this many seconds per user. */
export const PRESENCE_TOUCH_INTERVAL_SECONDS = 60;
export const PRESENCE_TOUCH_KEY_PREFIX = 'auth:presence-touch:';

export const BAN_REASON_MAX_LENGTH = 500;
/** A timed ban longer than ten years is a lifetime ban in all but name. */
export const BAN_MAX_DURATION_MS = 10 * 365 * 24 * 60 * 60 * 1000;

/** Length of a server-generated password. */
export const GENERATED_PASSWORD_LENGTH = 20;

/** E.164-ish: a plus, a non-zero digit, 6 to 14 more digits. Same rule as registration. */
export const PHONE_E164_PATTERN = /^\+[1-9]\d{6,14}$/;

/** Milliseconds per timed-ban unit. LIFETIME has none. */
export const BAN_MS_PER_UNIT = {
  MINUTES: 60_000,
  HOURS: 3_600_000,
  DAYS: 86_400_000,
} as const;

/** Look-alike free alphabets for generated passwords (no 0 O 1 l I). */
export const PASSWORD_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const PASSWORD_LOWER = 'abcdefghijkmnopqrstuvwxyz';
export const PASSWORD_DIGITS = '23456789';
export const PASSWORD_SYMBOLS = '!@#$%^&*-_+=?';

/** Longest textual IP address (IPv6 with an embedded IPv4 tail) that fits users.registration_ip. */
export const MAX_IP_ADDRESS_LENGTH = 45;

export const EMPTY_REGISTRATION_ORIGIN: { readonly ip: null; readonly countryCode: null } = {
  ip: null,
  countryCode: null,
};
