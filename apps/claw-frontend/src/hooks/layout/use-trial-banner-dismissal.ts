import { useCallback, useReducer, useSyncExternalStore } from 'react';

import type { TrialBannerDismissalChoice } from '@/enums/trial-banner-dismissal.enum';
import { useAuthStore } from '@/stores/auth.store';
import type { TrialBannerDismissalView } from '@/types/trial-status.types';
import {
  isTrialBannerSuppressed,
  parseTrialBannerDismissal,
  readTrialBannerDismissalRaw,
  readTrialBannerDismissalServerSnapshot,
  subscribeToTrialBannerDismissal,
  writeTrialBannerDismissal,
} from '@/utilities/trial-banner-dismissal.utility';

/**
 * The signed-in user's close/snooze choice for the trial banner.
 * `daysRemaining === null` means the banner is not dismissible (expired trial).
 */
export function useTrialBannerDismissal(daysRemaining: number | null): TrialBannerDismissalView {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const [, rerender] = useReducer((version: number) => version + 1, 0);
  const raw = useSyncExternalStore(
    subscribeToTrialBannerDismissal,
    () => (userId === null ? null : readTrialBannerDismissalRaw(userId)),
    readTrialBannerDismissalServerSnapshot,
  );

  const dismiss = useCallback(
    (choice: TrialBannerDismissalChoice) => {
      if (userId === null) {
        return;
      }
      writeTrialBannerDismissal(userId, choice, Date.now());
      rerender();
    },
    [userId],
  );

  const isSuppressed =
    daysRemaining !== null &&
    isTrialBannerSuppressed(parseTrialBannerDismissal(raw), daysRemaining, Date.now());
  return { isSuppressed, dismiss };
}
