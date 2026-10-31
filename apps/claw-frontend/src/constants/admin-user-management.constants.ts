import { BanDurationUnit } from '@/enums/ban-duration-unit.enum';
import { PresenceState } from '@/enums/presence-state.enum';

/** The signed-in tab pings the server this often while it is visible. */
export const PRESENCE_HEARTBEAT_INTERVAL_MS = 60_000;

/** The admin presence counters refresh this often while the page is open. */
export const PRESENCE_SUMMARY_REFETCH_INTERVAL_MS = 60_000;

/** Same windows as the server (auth-service user-admin.constants). */
export const PRESENCE_ONLINE_WINDOW_MS = 5 * 60_000;
export const PRESENCE_ACTIVE_WINDOW_MS = 24 * 60 * 60_000;

export const BAN_REASON_MAX_LENGTH = 500;
export const BAN_AMOUNT_MAX = 100_000;
export const BAN_DEFAULT_AMOUNT = 1;

/** The units the ban dialog offers, in display order, with their i18n keys. */
export const BAN_DURATION_UNIT_OPTIONS: ReadonlyArray<{
  value: BanDurationUnit;
  labelKey: string;
}> = [
  { value: BanDurationUnit.MINUTES, labelKey: 'admin.banUnitMinutes' },
  { value: BanDurationUnit.HOURS, labelKey: 'admin.banUnitHours' },
  { value: BanDurationUnit.DAYS, labelKey: 'admin.banUnitDays' },
  { value: BanDurationUnit.LIFETIME, labelKey: 'admin.banUnitLifetime' },
];

/** E.164-ish, the same rule the API enforces: a plus, a non-zero digit, 6 to 14 more digits. */
export const ADMIN_PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;

/** Shown in place of a value the server does not have (no IP, no country, never seen). */
export const ADMIN_USER_EMPTY_VALUE = '-';

/** i18n key and dot colour per presence state. */
export const PRESENCE_STATE_LABEL_KEYS: Readonly<Record<PresenceState, string>> = {
  [PresenceState.ONLINE]: 'admin.presenceOnline',
  [PresenceState.RECENT]: 'admin.presenceRecent',
  [PresenceState.OFFLINE]: 'admin.presenceOffline',
};

export const PRESENCE_STATE_DOT_CLASSES: Readonly<Record<PresenceState, string>> = {
  [PresenceState.ONLINE]: 'bg-success',
  [PresenceState.RECENT]: 'bg-warning',
  [PresenceState.OFFLINE]: 'bg-muted-foreground/40',
};
