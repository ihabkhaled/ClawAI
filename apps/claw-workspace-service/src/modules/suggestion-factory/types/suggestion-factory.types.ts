import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

export type WorkspaceEventInput = {
  eventType: string;
  provider: WorkspaceProvider | null;
  connectorId: string | null;
  userId: string;
  body: Record<string, unknown> | unknown[];
  sourceObjectId?: string | null;
};

export type FactoryProcessResult = {
  matchedRules: number;
  enqueuedCount: number;
  skippedCount: number;
};

export type CreateTriggerRuleInput = {
  name: string;
  description?: string;
  eventType: string;
  providerRegex: string;
  contentRegex: string;
  actionKindToSuggest: string;
  isActive: boolean;
  priority: number;
};

export type UpdateTriggerRuleInput = Partial<Omit<CreateTriggerRuleInput, 'name'>>;
