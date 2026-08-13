import type { DeploymentStatusView } from '@claw/shared-types';

import type { TranslateFunction } from '@/types/i18n.types';
import type { UserProfile } from '@/types/user.types';

export type UseDeploymentPageResult = {
  t: TranslateFunction;
  locale: string;
  user: UserProfile | null;
  status: DeploymentStatusView | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isRefreshing: boolean;
  retry: () => void;
};

export type DeploymentStatusContentProps = {
  t: TranslateFunction;
  locale: string;
  status: DeploymentStatusView;
};

export type DeploymentPhaseRailProps = {
  status: DeploymentStatusView;
  t: TranslateFunction;
};
