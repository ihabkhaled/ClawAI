import type { AiActionPolicyKind } from '../enums/ai-action-policy-kind.enum';
import type { RiskLabel } from '../enums/risk-label.enum';

import type { TranslateFunction } from './i18n.types';

export type AiActionPolicy = {
  id: string;
  name: string;
  kind: AiActionPolicyKind;
  description: string | null;
  providerRegex: string;
  actionKindRegex: string;
  riskMaxLabel: RiskLabel;
  riskMaxScore: number;
  priority: number;
  requireReason: boolean;
  isActive: boolean;
  isSystemDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAiActionPolicyRequest = {
  name: string;
  kind: AiActionPolicyKind;
  description?: string;
  providerRegex: string;
  actionKindRegex: string;
  riskMaxLabel: RiskLabel;
  riskMaxScore: number;
  priority: number;
  requireReason: boolean;
  isActive: boolean;
};

export type UpdateAiActionPolicyRequest = Partial<Omit<CreateAiActionPolicyRequest, 'name'>>;

export type SuggestionTriggerRule = {
  id: string;
  name: string;
  description: string | null;
  eventType: string;
  providerRegex: string;
  contentRegex: string;
  actionKindToSuggest: string;
  isActive: boolean;
  isSystemDefault: boolean;
  priority: number;
  perRuleBudgetPerHour: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateSuggestionTriggerRuleRequest = {
  name: string;
  description?: string;
  eventType: string;
  providerRegex?: string;
  contentRegex?: string;
  actionKindToSuggest: string;
  priority?: number;
  isActive?: boolean;
  perRuleBudgetPerHour?: number | null;
};

export type UpdateSuggestionTriggerRuleRequest = Partial<
  Omit<CreateSuggestionTriggerRuleRequest, 'name'>
>;

export type AdminPolicyPageRenderProps = {
  policies: AiActionPolicy[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isMutating: boolean;
  pendingId: string | null;
  mutationError: Error | null;
  clearMutationError: () => void;
  onTogglePolicyActive: (id: string, next: boolean) => void;
  onDeletePolicy: (id: string) => void;
  t: TranslateFunction;
};

export type AdminRulesPageRenderProps = {
  rules: SuggestionTriggerRule[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isMutating: boolean;
  pendingId: string | null;
  mutationError: Error | null;
  clearMutationError: () => void;
  onToggleRuleActive: (id: string, next: boolean) => void;
  onDeleteRule: (id: string) => void;
  t: TranslateFunction;
};

export type AiActionPolicyRowProps = {
  policy: AiActionPolicy;
  onToggleActive: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
  isMutating: boolean;
  t: TranslateFunction;
};

export type SuggestionRuleRowProps = {
  rule: SuggestionTriggerRule;
  onToggleActive: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
  isMutating: boolean;
  t: TranslateFunction;
};

export type UseAiActionPoliciesPageResult = Omit<AdminPolicyPageRenderProps, 't'>;
export type UseSuggestionRulesPageResult = Omit<AdminRulesPageRenderProps, 't'>;
