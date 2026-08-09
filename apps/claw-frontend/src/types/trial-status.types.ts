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
};

export type TrialStatusBannerView = HiddenTrialStatusBannerView | VisibleTrialStatusBannerView;
