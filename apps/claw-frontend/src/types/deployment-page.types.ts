import type { DeploymentStatusView, DeploymentTriggerMode } from '@claw/shared-types';

import type { TranslateFunction } from '@/types/i18n.types';
import type { UserProfile } from '@/types/user.types';

/** Body of a manual deployment request; `targetSha` belongs to the sha mode only. */
export type DeploymentTriggerInput = {
  mode: DeploymentTriggerMode;
  targetSha?: string;
};

/** Operational lane flags the deployment endpoints return alongside a status. */
export type DeploymentAutomationFlags = {
  manualTriggerEnabled: boolean;
  automaticDeployEnabled: boolean;
};

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
  actions: UseDeploymentActionsResult;
};

/** Every manual control on the page, plus which one is currently in flight. */
export type UseDeploymentActionsResult = {
  targetSha: string;
  setTargetSha: (value: string) => void;
  isShaValid: boolean;
  pendingMode: DeploymentTriggerMode | null;
  isResetting: boolean;
  isSwitchingAutomation: boolean;
  isBusy: boolean;
  deployLatest: () => void;
  redeploy: () => void;
  deploySha: () => void;
  reset: () => void;
  setAutomaticDeploy: (enabled: boolean) => void;
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

export type DeploymentControlPanelProps = {
  t: TranslateFunction;
  status: DeploymentStatusView;
  actions: UseDeploymentActionsResult;
};
