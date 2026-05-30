import type { TranslateFunction } from './i18n.types';
import type { AiActionRiskLabel } from './workspace.types';

export type AutomationPreferenceView = {
  actionKind: string;
  isEnabled: boolean;
  autoApproveBelowRiskScore: number | null;
  perDayBudget: number | null;
  providers: string[];
};

export type UpsertAutomationPreferenceRequest = {
  isEnabled?: boolean;
  autoApproveBelowRiskScore?: number | null;
  perDayBudget?: number | null;
  providers?: string[];
};

export type AutomationPreferenceRowProps = {
  preference: AutomationPreferenceView;
  onSave: (
    actionKind: string,
    next: {
      isEnabled?: boolean;
      autoApproveBelowRiskScore?: number | null;
      perDayBudget?: number | null;
    },
  ) => void;
  isPending: boolean;
  // When false (regular USER without ADMIN_WORKSPACE_AUTOMATION_MANAGE) every
  // control on the row is rendered disabled so the values can be read but not
  // saved. Backend remains the authoritative enforcer.
  canManage: boolean;
  t: TranslateFunction;
};

export type UseAutomationPreferencesPageResult = {
  preferences: AutomationPreferenceView[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSaving: boolean;
  savePreference: (actionKind: string, payload: UpsertAutomationPreferenceRequest) => void;
  // True iff the current viewer is allowed to mutate workspace-level configs
  // (ADMIN or anyone holding ADMIN_WORKSPACE_AUTOMATION_MANAGE).
  canManage: boolean;
};

export type RiskBadgeProps = {
  label: AiActionRiskLabel;
  score: number | null | undefined;
  matchedPolicyName?: string | null;
};

export type LearnedPreferencesPanelProps = {
  t: TranslateFunction;
};
