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
  t: TranslateFunction;
};

export type UseAutomationPreferencesPageResult = {
  preferences: AutomationPreferenceView[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSaving: boolean;
  savePreference: (actionKind: string, payload: UpsertAutomationPreferenceRequest) => void;
};

export type RiskBadgeProps = {
  label: AiActionRiskLabel;
  score: number | null | undefined;
  matchedPolicyName?: string | null;
};

export type LearnedPreferencesPanelProps = {
  t: TranslateFunction;
};

export type UseDismissLearnedPreferenceReturn = {
  dismiss: (id: string) => void;
  isPending: boolean;
  pendingId: string | null;
};
