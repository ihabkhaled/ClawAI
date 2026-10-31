import { BanDurationUnit } from '../../../common/enums';
import { BAN_MAX_DURATION_MS, BAN_MS_PER_UNIT } from '../constants/user-admin.constants';
import { type BanColumns, type BanState } from '../types/user-admin.types';

/** Decided from the clock every time, so a timed ban lifts itself with no job. */
export function resolveBanState(columns: BanColumns, now: Date = new Date()): BanState {
  if (columns.bannedAt === null) return { status: 'NONE' };
  if (columns.bannedUntil === null) return { status: 'ACTIVE', permanent: true, until: null };
  return columns.bannedUntil.getTime() > now.getTime()
    ? { status: 'ACTIVE', permanent: false, until: columns.bannedUntil }
    : { status: 'EXPIRED' };
}

function msPerUnit(unit: Exclude<BanDurationUnit, BanDurationUnit.LIFETIME>): number {
  switch (unit) {
    case BanDurationUnit.MINUTES:
      return BAN_MS_PER_UNIT.MINUTES;
    case BanDurationUnit.HOURS:
      return BAN_MS_PER_UNIT.HOURS;
    case BanDurationUnit.DAYS:
      return BAN_MS_PER_UNIT.DAYS;
  }
}

/** The end of a ban that starts `now`, or null for LIFETIME. Throws RangeError past the ten-year cap or for a bad amount. */
export function computeBannedUntil(
  unit: BanDurationUnit,
  amount: number | undefined,
  now: Date,
): Date | null {
  if (unit === BanDurationUnit.LIFETIME) return null;
  if (amount === undefined || !Number.isInteger(amount) || amount < 1) {
    throw new RangeError('A timed ban needs a whole number of at least 1');
  }
  const duration = amount * msPerUnit(unit);
  if (duration > BAN_MAX_DURATION_MS) {
    throw new RangeError('A timed ban cannot exceed ten years; use a lifetime ban');
  }
  return new Date(now.getTime() + duration);
}
