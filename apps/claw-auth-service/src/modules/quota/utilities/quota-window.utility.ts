import { QuotaWindow } from '@claw/shared-types';
import { isoWeekKey, utcMonthKey } from '../../../common/utilities/period-key.utility';
import { utcDateString } from '../constants/quota.constants';
import { type QuotaWindowLimits } from '../types/quota.types';

// The UTC period a window's counter is bucketed by.
export function periodKeyForWindow(window: QuotaWindow, now: Date): string {
  if (window === QuotaWindow.WEEK) {
    return isoWeekKey(now);
  }
  if (window === QuotaWindow.MONTH) {
    return utcMonthKey(now);
  }
  return utcDateString(now);
}

// null = unlimited for this window, 0 = disabled. Not interchangeable.
export function limitForWindow(window: QuotaWindow, limits: QuotaWindowLimits): number | null {
  if (window === QuotaWindow.WEEK) {
    return limits.weekly;
  }
  if (window === QuotaWindow.MONTH) {
    return limits.monthly;
  }
  return limits.daily;
}
