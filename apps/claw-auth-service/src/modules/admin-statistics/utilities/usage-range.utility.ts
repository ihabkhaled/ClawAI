import { BadRequestException } from '@nestjs/common';

import {
  ADMIN_USAGE_HOURLY_MAX_DAYS,
  ADMIN_USAGE_MAX_RANGE_DAYS,
  MS_PER_DAY,
  MS_PER_HOUR,
} from '../constants/admin-usage-analytics.constants';
import {
  type AdminUsageRange,
  type AdminUsageRangeInput,
} from '../types/admin-usage-analytics.types';

/**
 * Resolves a caller's time selection to a bounded half-open window.
 *
 * Precedence: `hours` (last N hours ending now) > explicit `from`/`to` >
 * `fallbackDays` back from now. `to` is clamped to now (the future holds no
 * rows) and a window wider than 90 days is REJECTED, not clamped: silently
 * shortening a range an operator picked would make the totals lie.
 * Grain is hourly up to 7 days, daily beyond.
 */
export function resolveUsageRange(
  input: AdminUsageRangeInput,
  now: Date,
  fallbackDays: number,
): AdminUsageRange {
  const nowMs = now.getTime();
  let toMs = nowMs;
  let fromMs = nowMs - fallbackDays * MS_PER_DAY;

  if (input.hours !== undefined) {
    fromMs = nowMs - input.hours * MS_PER_HOUR;
  } else if (input.from !== undefined || input.to !== undefined) {
    toMs = input.to === undefined ? nowMs : Math.min(Date.parse(input.to), nowMs);
    fromMs = input.from === undefined ? toMs - fallbackDays * MS_PER_DAY : Date.parse(input.from);
  }

  if (!(fromMs < toMs)) {
    throw new BadRequestException({
      message: 'from must be before to',
      code: 'USAGE_RANGE_INVALID',
    });
  }
  if (toMs - fromMs > ADMIN_USAGE_MAX_RANGE_DAYS * MS_PER_DAY) {
    throw new BadRequestException({
      message: `range cannot exceed ${ADMIN_USAGE_MAX_RANGE_DAYS} days`,
      code: 'USAGE_RANGE_TOO_WIDE',
    });
  }

  return {
    from: new Date(fromMs),
    to: new Date(toMs),
    grain: toMs - fromMs <= ADMIN_USAGE_HOURLY_MAX_DAYS * MS_PER_DAY ? 'HOUR' : 'DAY',
  };
}

/** First instant of the UTC day `now` falls in. */
export function utcDayStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
