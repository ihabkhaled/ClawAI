import {
  ADMIN_PHONE_PATTERN,
  ADMIN_USER_EMPTY_VALUE,
  PRESENCE_ACTIVE_WINDOW_MS,
  PRESENCE_ONLINE_WINDOW_MS,
} from '@/constants/admin-user-management.constants';
import { PresenceState } from '@/enums/presence-state.enum';
import type { AdminUser } from '@/types/audit.types';

/**
 * Where a user stands on the presence clock, recomputed from `lastSeenAt` against
 * `now` so a list that has sat in the cache for a few minutes does not keep
 * showing someone as online. Same windows as the server; the boundary is inside.
 */
export function resolvePresenceState(
  lastSeenAt: string | null,
  now: number = Date.now(),
): PresenceState {
  if (lastSeenAt === null) {
    return PresenceState.OFFLINE;
  }
  const seen = Date.parse(lastSeenAt);
  if (Number.isNaN(seen)) {
    return PresenceState.OFFLINE;
  }
  const age = now - seen;
  if (age <= PRESENCE_ONLINE_WINDOW_MS) {
    return PresenceState.ONLINE;
  }
  return age <= PRESENCE_ACTIVE_WINDOW_MS ? PresenceState.RECENT : PresenceState.OFFLINE;
}

/** The regional-indicator flag emoji for an ISO 3166-1 alpha-2 code, or '' for anything else. */
export function countryFlagEmoji(countryCode: string | null): string {
  if (countryCode === null || !/^[A-Za-z]{2}$/.test(countryCode)) {
    return '';
  }
  const base = 0x1f1e6 - 'A'.charCodeAt(0);
  return [...countryCode.toUpperCase()]
    .map((letter) => String.fromCodePoint(base + letter.charCodeAt(0)))
    .join('');
}

/** "Egypt (EG)" in the reader's language, the bare code when the runtime cannot name it, '-' when unknown. */
export function formatCountryLabel(countryCode: string | null, locale: string): string {
  if (countryCode === null) {
    return ADMIN_USER_EMPTY_VALUE;
  }
  const upper = countryCode.toUpperCase();
  try {
    const name = new Intl.DisplayNames([locale], { type: 'region' }).of(upper);
    return name !== undefined && name !== upper ? `${name} (${upper})` : upper;
  } catch {
    return upper;
  }
}

/** The address, or '-' when the account has none (admin-created, or registered before ADR-200). */
export function formatRegistrationIp(ip: string | null): string {
  return ip === null || ip === '' ? ADMIN_USER_EMPTY_VALUE : ip;
}

/** True for a phone number the API will accept: international format, 7 to 15 digits. */
export function isValidAdminPhone(phone: string): boolean {
  return ADMIN_PHONE_PATTERN.test(phone);
}

/** The full name, or '-' when neither part is set. */
export function formatAdminUserFullName(user: Pick<AdminUser, 'firstName' | 'lastName'>): string {
  const full = [user.firstName, user.lastName]
    .filter((part) => part !== null && part !== '')
    .join(' ');
  return full === '' ? ADMIN_USER_EMPTY_VALUE : full;
}

/** A local date and time for a timestamp, or '-' when the value is null or not a date. */
export function formatAdminTimestamp(value: string | null, locale: string): string {
  if (value === null) {
    return ADMIN_USER_EMPTY_VALUE;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? ADMIN_USER_EMPTY_VALUE : parsed.toLocaleString(locale);
}
