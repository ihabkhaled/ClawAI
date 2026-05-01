export type AutomationPreferenceRecord = {
  id: string;
  userId: string;
  actionKind: string;
  isEnabled: boolean;
  autoApproveBelowRiskScore: number | null;
  perDayBudget: number | null;
  providers: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertAutomationPreferenceInput = {
  userId: string;
  actionKind: string;
  isEnabled?: boolean;
  autoApproveBelowRiskScore?: number | null;
  perDayBudget?: number | null;
  providers?: string[];
};

export type AutomationPreferenceUserView = {
  actionKind: string;
  isEnabled: boolean;
  autoApproveBelowRiskScore: number | null;
  perDayBudget: number | null;
  providers: string[];
};

export type LearnedPreferenceItem = {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  updatedAt: string;
};
