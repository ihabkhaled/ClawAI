import type { TrialBannerDismissalChoice } from '@/enums/trial-banner-dismissal.enum';
import type { TrialStatus } from '@/enums/trial-status.enum';

export type HiddenTrialStatusBannerView = {
  status: TrialStatus.HIDDEN;
};

export type VisibleTrialStatusBannerView = {
  status: TrialStatus.ACTIVE | TrialStatus.EXPIRED;
  title: string;
  body: string;
  upgradeLabel: string;
  upgradeHref: string;
  /** Whole days left, rounded up; 0 for an expired trial. */
  daysRemaining: number;
};

export type TrialStatusBannerView = HiddenTrialStatusBannerView | VisibleTrialStatusBannerView;

/** Stored per user. `until` is an epoch-ms snooze expiry; `null` means "hide forever". */
export type TrialBannerDismissalRecord = {
  until: number | null;
};

export type TrialBannerDismissalOption = {
  choice: TrialBannerDismissalChoice;
  labelKey: string;
};

export type TrialBannerDismissalView = {
  isSuppressed: boolean;
  dismiss: (choice: TrialBannerDismissalChoice) => void;
};

export type TrialBannerDismissMenuProps = {
  onDismiss: (choice: TrialBannerDismissalChoice) => void;
};
