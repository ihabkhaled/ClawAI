import {
  AUTO_SUSPENSION_REASON_PREFIX,
  COUNTED_SIGNAL_CODES,
} from '../constants/abuse-defense.constants';
import type { AbuseSignalCode } from '../enums/abuse-signal-code.enum';
import type { AbuseEvidence } from '../types/abuse-defense.types';

/** The text an automatic suspension writes to `users.ban_reason`. A code, never prose. */
export function autoSuspensionReason(code: AbuseSignalCode): string {
  return `${AUTO_SUSPENSION_REASON_PREFIX}${code}`;
}

/**
 * Whether a ban row is an automatic suspension: written by the system (no admin actor)
 * with the reserved reason prefix. An administrator typing the prefix into a manual ban
 * still has their own id on the row, so it is never mistaken for one.
 */
export function isAutoSuspension(ban: {
  banReason?: string | null;
  bannedByUserId?: string | null;
}): boolean {
  return (
    (ban.bannedByUserId ?? null) === null &&
    (ban.banReason ?? '').startsWith(AUTO_SUSPENSION_REASON_PREFIX)
  );
}

/** Reads stored evidence back into counts per counted code; anything else in the JSON is dropped. */
export function parseEvidence(raw: unknown): AbuseEvidence {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const record = new Map(Object.entries(raw));
  return Object.fromEntries(
    COUNTED_SIGNAL_CODES.flatMap((code) => {
      const value = record.get(code);
      return typeof value === 'number' && Number.isFinite(value) ? [[code, value]] : [];
    }),
  );
}
