import { PlanFeatureWindow } from '../../../generated/prisma';
import { isoWeekKey, utcDayKey, utcMonthKey } from '../../../common/utilities/period-key.utility';

// The bucket a feature run is counted in. LIFETIME deliberately has no period
// component — that is what makes the Free tier's one-shot Compare/Judge/
// Research/Critic trials permanent rather than resetting every month.
export function featurePeriodKey(
  window: PlanFeatureWindow,
  now: Date,
  billingPeriodKey: string | null,
): string {
  switch (window) {
    case PlanFeatureWindow.LIFETIME: {
      return 'LIFETIME';
    }
    case PlanFeatureWindow.DAY: {
      return utcDayKey(now);
    }
    case PlanFeatureWindow.WEEK: {
      return isoWeekKey(now);
    }
    case PlanFeatureWindow.MONTH: {
      return utcMonthKey(now);
    }
    case PlanFeatureWindow.BILLING_PERIOD: {
      // Without a known billing period there is nothing to scope the allowance
      // to, so fall back to the calendar month rather than to "unlimited".
      return billingPeriodKey ?? utcMonthKey(now);
    }
    default: {
      return utcMonthKey(now);
    }
  }
}
