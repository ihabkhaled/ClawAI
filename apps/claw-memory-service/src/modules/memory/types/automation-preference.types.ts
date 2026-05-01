export type UpsertAutomationPreferenceBody = {
  userId: string;
  actionKind: string;
  content: string;
  confidence?: number;
  evidence?: string;
};
