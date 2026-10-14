import { AdapterFailureKind } from '../../../common/enums/adapter-failure-kind.enum';
import { AdapterError } from '../errors/adapter.error';
import {
  LOCAL_TIME_MINUTES_PATTERN,
  LOCAL_TIME_SECONDS_PATTERN,
  MS_PER_MINUTE,
} from '../constants/time.constants';
import { type ZonedClock } from '../types/time.types';

/** Throws a user-safe error for a name Intl does not know. */
export function assertTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
  } catch {
    throw new AdapterError(AdapterFailureKind.BAD_INPUT, `Unknown time zone "${timeZone}"`);
  }
}

function partsOf(instant: Date, timeZone: string): Map<string, string> {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return new Map(formatter.formatToParts(instant).map((part) => [part.type, part.value]));
}

/** Offset of the zone from UTC at that instant, in minutes (east is positive). */
export function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = partsOf(instant, timeZone);
  const asUtc = Date.UTC(
    Number(parts.get('year')),
    Number(parts.get('month')) - 1,
    Number(parts.get('day')),
    Number(parts.get('hour')),
    Number(parts.get('minute')),
    Number(parts.get('second')),
  );
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / MS_PER_MINUTE);
}

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/** The wall clock of an instant in a zone. */
export function clockIn(instant: Date, timeZone: string): ZonedClock {
  assertTimeZone(timeZone);
  const parts = partsOf(instant, timeZone);
  return {
    date: `${parts.get('year')}-${parts.get('month')}-${parts.get('day')}`,
    time: `${parts.get('hour')}:${parts.get('minute')}:${parts.get('second')}`,
    weekday: parts.get('weekday') ?? '',
    timeZone,
    offset: formatOffset(zoneOffsetMinutes(instant, timeZone)),
    utc: `${instant.toISOString().slice(0, 19)}Z`,
  };
}

/**
 * The instant that shows `local` (an ISO date-time without an offset) on the wall clock of
 * `timeZone`. Resolves daylight-saving gaps and overlaps by taking the offset that applies at
 * the resulting instant.
 */
export function instantFromLocal(local: string, timeZone: string): Date {
  assertTimeZone(timeZone);
  const match = LOCAL_TIME_SECONDS_PATTERN.exec(local) ?? LOCAL_TIME_MINUTES_PATTERN.exec(local);
  if (match === null) {
    throw new AdapterError(
      AdapterFailureKind.BAD_INPUT,
      'Time must look like 2026-03-29T09:30:00 (no offset)',
    );
  }
  const [, year, month, day, hour, minute, seconds] = match;
  const asUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(seconds ?? 0),
  );
  const check = new Date(asUtc);
  const exists =
    check.getUTCMonth() + 1 === Number(month) &&
    check.getUTCDate() === Number(day) &&
    check.getUTCHours() === Number(hour) &&
    check.getUTCMinutes() === Number(minute) &&
    check.getUTCSeconds() === Number(seconds ?? 0);
  if (!exists) {
    throw new AdapterError(AdapterFailureKind.BAD_INPUT, 'That date and time do not exist');
  }
  const first = zoneOffsetMinutes(new Date(asUtc), timeZone);
  const guess = new Date(asUtc - first * MS_PER_MINUTE);
  const atGuess = zoneOffsetMinutes(guess, timeZone);
  return atGuess === first ? guess : new Date(asUtc - atGuess * MS_PER_MINUTE);
}
