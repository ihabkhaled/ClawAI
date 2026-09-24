import { TrialBannerDismissalChoice } from '@/enums/trial-banner-dismissal.enum';
import type { TrialBannerDismissalOption } from '@/types/trial-status.types';

/** localStorage key prefix; the user id is appended so accounts never share a choice. */
export const TRIAL_BANNER_DISMISSAL_STORAGE_PREFIX = 'trialBanner:dismissal:';

/** A snooze stops working once this many days (or fewer) of trial are left. */
export const TRIAL_BANNER_SNOOZE_OVERRIDE_DAYS = 3;

/** "Hide forever" stops working once this many days (or fewer) of trial are left. */
export const TRIAL_BANNER_HIDE_FOREVER_OVERRIDE_DAYS = 1;

/** Snooze length in days per choice. `null` = hide forever (stored as `until: null`). */
export const TRIAL_BANNER_SNOOZE_DAYS: Readonly<Record<TrialBannerDismissalChoice, number | null>> =
  {
    [TrialBannerDismissalChoice.REMIND_IN_ONE_DAY]: 1,
    [TrialBannerDismissalChoice.REMIND_IN_SEVEN_DAYS]: 7,
    [TrialBannerDismissalChoice.HIDE_FOREVER]: null,
  };

export const TRIAL_BANNER_DISMISSAL_OPTIONS: readonly TrialBannerDismissalOption[] = [
  {
    choice: TrialBannerDismissalChoice.REMIND_IN_ONE_DAY,
    labelKey: 'trialStatus.remindInOneDay',
  },
  {
    choice: TrialBannerDismissalChoice.REMIND_IN_SEVEN_DAYS,
    labelKey: 'trialStatus.remindInSevenDays',
  },
  { choice: TrialBannerDismissalChoice.HIDE_FOREVER, labelKey: 'trialStatus.hideForever' },
];
