import {
  CRON_FIELD_COUNT,
  CRON_MAX_LENGTH,
  CRON_MIN_GAP_CHECKS,
  CRON_MIN_INTERVAL_MINUTES,
  CRON_MS_PER_MINUTE,
  CRON_RANGES,
  CRON_SEARCH_LIMIT,
  CRON_WHOLE_NUMBER,
} from '../constants/cron.constants';

import type { CronFieldRange, CronFields, CronParse, CronValidation } from '../types/cron.types';

function whole(text: string): number | undefined {
  return CRON_WHOLE_NUMBER.test(text) ? Number(text) : undefined;
}

function bounds(
  base: string,
  hasStep: boolean,
  range: CronFieldRange,
): readonly [number, number] | undefined {
  if (base === '*') return [range.min, range.max];
  const [from = '', to, ...more] = base.split('-');
  if (more.length > 0) return undefined;
  const low = whole(from);
  if (low === undefined) return undefined;
  // "5/10" means "from 5 to the end, every 10"; a bare "5" means just 5.
  const high = to === undefined ? (hasStep ? range.max : low) : whole(to);
  return high === undefined || low < range.min || high > range.max || low > high ? undefined : [low, high];
}

function partValues(part: string, range: CronFieldRange): number[] | undefined {
  const [base = '', stepText, ...extra] = part.split('/');
  if (extra.length > 0) return undefined;
  const step = stepText === undefined ? 1 : whole(stepText);
  if (step === undefined || step < 1) return undefined;
  const span = bounds(base, stepText !== undefined, range);
  if (span === undefined) return undefined;
  const values: number[] = [];
  for (let value = span[0]; value <= span[1]; value += step) values.push(value);
  return values;
}

function fieldValues(text: string, range: CronFieldRange): ReadonlySet<number> | undefined {
  const values = new Set<number>();
  for (const part of text.split(',')) {
    const found = partValues(part, range);
    if (found === undefined) return undefined;
    for (const value of found) values.add(value);
  }
  return values;
}

/**
 * Reads a five-field cron expression: minute hour day-of-month month day-of-week.
 *
 * The same grammar the coding-agent client accepts (numbers, lists, ranges,
 * `*`, steps); names, `L`, `W`, `#` and `@daily` are refused rather than guessed.
 */
export function parseCron(expression: string): CronParse {
  const text = expression.trim();
  if (text.length === 0 || text.length > CRON_MAX_LENGTH) {
    return { parsed: false, reason: 'The cron expression is empty or too long.' };
  }
  const parts = text.split(/\s+/u);
  if (parts.length !== CRON_FIELD_COUNT) {
    return {
      parsed: false,
      reason: 'A cron expression has five fields: minute hour day-of-month month day-of-week.',
    };
  }
  const sets = parts.map((part, index) => {
    const range = CRON_RANGES[index];
    return range === undefined ? undefined : fieldValues(part, range);
  });
  const [minutes, hours, daysOfMonth, months, weekdays] = sets;
  if (
    minutes === undefined ||
    hours === undefined ||
    daysOfMonth === undefined ||
    months === undefined ||
    weekdays === undefined
  ) {
    const bad = sets.findIndex((set) => set === undefined);
    return { parsed: false, reason: `The ${CRON_RANGES[bad]?.name ?? 'cron'} field is not valid.` };
  }
  return {
    parsed: true,
    fields: {
      minutes,
      hours,
      daysOfMonth,
      months,
      daysOfWeek: new Set([...weekdays].map((day) => day % 7)),
      anyDayOfMonth: parts[2] === '*',
      anyDayOfWeek: parts[4] === '*',
    },
  };
}

/** Standard cron: when both day fields are restricted, either one matching is enough. */
function dayMatches(fields: CronFields, date: Date): boolean {
  const monthDay = fields.daysOfMonth.has(date.getUTCDate());
  const weekDay = fields.daysOfWeek.has(date.getUTCDay());
  if (fields.anyDayOfMonth) return weekDay;
  return fields.anyDayOfWeek ? monthDay : monthDay || weekDay;
}

/**
 * The first matching minute strictly after `afterMs`, in UTC, or undefined when
 * none exists within the search limit (31 February). Server time zones vary
 * and daylight saving makes local wall-clock times ambiguous, so UTC is the
 * one unambiguous reading.
 */
export function nextCronRun(fields: CronFields, afterMs: number): number | undefined {
  const date = new Date(afterMs);
  date.setUTCSeconds(0, 0);
  date.setUTCMinutes(date.getUTCMinutes() + 1);
  for (let step = 0; step < CRON_SEARCH_LIMIT; step += 1) {
    if (!fields.months.has(date.getUTCMonth() + 1)) {
      date.setUTCMonth(date.getUTCMonth() + 1, 1);
      date.setUTCHours(0, 0, 0, 0);
    } else if (!dayMatches(fields, date)) {
      date.setUTCDate(date.getUTCDate() + 1);
      date.setUTCHours(0, 0, 0, 0);
    } else if (!fields.hours.has(date.getUTCHours())) {
      date.setUTCHours(date.getUTCHours() + 1, 0, 0, 0);
    } else if (!fields.minutes.has(date.getUTCMinutes())) {
      date.setUTCMinutes(date.getUTCMinutes() + 1, 0, 0);
    } else {
      return date.getTime();
    }
  }
  return undefined;
}

function tooFrequent(fields: CronFields, first: number): boolean {
  let previous = first;
  for (let index = 0; index < CRON_MIN_GAP_CHECKS; index += 1) {
    const next = nextCronRun(fields, previous);
    if (next === undefined) return false;
    if (next - previous < CRON_MIN_INTERVAL_MINUTES * CRON_MS_PER_MINUTE) return true;
    previous = next;
  }
  return false;
}

/**
 * A cron expression fit to store: parses, matches a real date, and never fires
 * more often than every five minutes (a polling loop in cron notation is still
 * a polling loop).
 */
export function validateCronForRoutine(expression: string, nowMs: number): CronValidation {
  const normalized = expression.trim().replaceAll(/\s+/gu, ' ');
  const parsed = parseCron(normalized);
  if (!parsed.parsed) return { valid: false, reason: parsed.reason };
  const first = nextCronRun(parsed.fields, nowMs);
  if (first === undefined) {
    return { valid: false, reason: 'That cron expression never matches a real date.' };
  }
  return tooFrequent(parsed.fields, first) ? {
      valid: false,
      reason: `A cron schedule may fire at most every ${String(CRON_MIN_INTERVAL_MINUTES)} minutes.`,
    } : { valid: true, expression: normalized, fields: parsed.fields };
}

/** The next run of a stored expression, or undefined when it no longer parses or has no date. */
export function nextRunForStoredCron(expression: string, afterMs: number): number | undefined {
  const parsed = parseCron(expression);
  return parsed.parsed ? nextCronRun(parsed.fields, afterMs) : undefined;
}
