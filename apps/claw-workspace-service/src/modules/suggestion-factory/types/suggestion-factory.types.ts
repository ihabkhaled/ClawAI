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
  rateLimited?: boolean;
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
  /** Stream 13.3 v1.1 — per-rule per-hour cap (null/undefined = unbounded). */
  perRuleBudgetPerHour?: number | null;
};

export type UpdateTriggerRuleInput = Partial<Omit<CreateTriggerRuleInput, 'name'>>;
