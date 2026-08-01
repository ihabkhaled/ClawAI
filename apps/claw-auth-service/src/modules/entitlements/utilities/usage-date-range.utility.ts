import { utcDayKey } from '../../../common/utilities/period-key.utility';
import { type UsageDateRanges } from '../types/usage-view.types';

export function buildUsageDateRanges(now: Date): UsageDateRanges {
  const today = utcDayKey(now);
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const isoDay = weekStart.getUTCDay() === 0 ? 7 : weekStart.getUTCDay();
  weekStart.setUTCDate(weekStart.getUTCDate() - (isoDay - 1));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  return {
    day: { fromDate: today, throughDate: today },
    week: { fromDate: utcDayKey(weekStart), throughDate: today },
    month: { fromDate: utcDayKey(monthStart), throughDate: today },
  };
}
