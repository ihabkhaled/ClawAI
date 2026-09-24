// Per-user "close" choice for the free-trial banner, kept in localStorage.
//
// Decision (documented in docs/05-frontend/trial-banner-dismissal.md):
// - "Remind me in 1/7 days" stores an expiry; the banner returns when it passes,
//   OR as soon as 3 or fewer trial days are left, whichever comes first.
// - "Hide forever" is honoured until 1 or fewer days are left. On the last day
//   the banner comes back, because silently losing AI access is worse than one
//   more line of chrome. An expired trial is never dismissible.
import {
  TRIAL_BANNER_DISMISSAL_STORAGE_PREFIX,
  TRIAL_BANNER_HIDE_FOREVER_OVERRIDE_DAYS,
  TRIAL_BANNER_SNOOZE_DAYS,
  TRIAL_BANNER_SNOOZE_OVERRIDE_DAYS,
} from '@/constants/trial-banner-dismissal.constants';
import { MILLISECONDS_PER_TRIAL_DAY } from '@/constants/trial-status.constants';
import type { TrialBannerDismissalChoice } from '@/enums/trial-banner-dismissal.enum';
import type { TrialBannerDismissalRecord } from '@/types/trial-status.types';

import { logger } from './logger.utility';

export function trialBannerDismissalKey(userId: string): string {
  return `${TRIAL_BANNER_DISMISSAL_STORAGE_PREFIX}${userId}`;
}

export function buildTrialBannerDismissal(
  choice: TrialBannerDismissalChoice,
  now: number,
): TrialBannerDismissalRecord {
  const days = TRIAL_BANNER_SNOOZE_DAYS[choice];
  return { until: days === null ? null : now + days * MILLISECONDS_PER_TRIAL_DAY };
}

export function parseTrialBannerDismissal(raw: string | null): TrialBannerDismissalRecord | null {
  if (raw === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || !('until' in parsed)) {
      return null;
    }
    const { until } = parsed;
    if (until === null || (typeof until === 'number' && Number.isFinite(until))) {
      return { until };
    }
  } catch {
    return null;
  }
  return null;
}

export function isTrialBannerSuppressed(
  record: TrialBannerDismissalRecord | null,
  daysRemaining: number,
  now: number,
): boolean {
  if (record === null) {
    return false;
  }
  if (record.until === null) {
    return daysRemaining > TRIAL_BANNER_HIDE_FOREVER_OVERRIDE_DAYS;
  }
  return daysRemaining > TRIAL_BANNER_SNOOZE_OVERRIDE_DAYS && now < record.until;
}

export function readTrialBannerDismissalRaw(userId: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(trialBannerDismissalKey(userId));
  } catch (error) {
    logger.warn({
      component: 'trial-banner',
      action: 'dismissal-storage-read',
      message: 'localStorage read failed; showing the trial banner',
      details: { error: (error as Error).message },
    });
    return null;
  }
}

export function writeTrialBannerDismissal(
  userId: string,
  choice: TrialBannerDismissalChoice,
  now: number,
): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(
      trialBannerDismissalKey(userId),
      JSON.stringify(buildTrialBannerDismissal(choice, now)),
    );
  } catch (error) {
    logger.warn({
      component: 'trial-banner',
      action: 'dismissal-storage-write',
      message: 'localStorage write failed; the dismissal will not survive a reload',
      details: { error: (error as Error).message },
    });
  }
}

/** Server render never knows the choice, so it always renders the banner state. */
export function readTrialBannerDismissalServerSnapshot(): null {
  return null;
}

/** Re-read when another tab changes the choice. */
export function subscribeToTrialBannerDismissal(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}
