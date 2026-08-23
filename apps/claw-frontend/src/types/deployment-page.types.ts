import type {
  DeploymentRunJob,
  DeploymentRunProgress,
  DeploymentRunStep,
  DeploymentStatusView,
  DeploymentTriggerMode,
} from '@claw/shared-types';

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

/** Credentials an admin submits from the deployment page. */
export type DeploymentCredentialInput = {
  repository: string;
  ref: string;
  /** Omitted when only the repository or ref is being corrected. */
  token?: string;
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
  credentials: UseDeploymentCredentialsFormResult;
  progress: UseDeploymentRunProgressResult;
};

/** Live GitHub Actions progress for the most recent production run. */
export type UseDeploymentRunProgressResult = {
  progress: DeploymentRunProgress | null;
  isLoading: boolean;
};

/** The credentials form: local field state plus its two mutations. */
export type UseDeploymentCredentialsFormResult = {
  repository: string;
  setRepository: (value: string) => void;
  ref: string;
  setRef: (value: string) => void;
  token: string;
  setToken: (value: string) => void;
  isEditing: boolean;
  startEditing: () => void;
  cancelEditing: () => void;
  isSaving: boolean;
  isClearing: boolean;
  canSave: boolean;
  save: () => void;
  clear: () => void;
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

export type DeploymentCredentialsCardProps = {
  t: TranslateFunction;
  locale: string;
  status: DeploymentStatusView;
  credentials: UseDeploymentCredentialsFormResult;
};

export type DeploymentRunProgressCardProps = {
  t: TranslateFunction;
  locale: string;
  progress: UseDeploymentRunProgressResult;
};

export type DeploymentRunJobRowProps = {
  t: TranslateFunction;
  job: DeploymentRunJob;
};

export type DeploymentRunStepRowProps = {
  t: TranslateFunction;
  step: DeploymentRunStep;
};

export type DeploymentTroubleshootingCardProps = {
  t: TranslateFunction;
  status: DeploymentStatusView;
  progress: UseDeploymentRunProgressResult;
};
