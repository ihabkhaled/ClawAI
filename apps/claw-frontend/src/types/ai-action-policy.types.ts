import type { AdminFormMode } from '../enums/admin-form-mode.enum';
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
  isCreating: boolean;
  onCreatePolicy: (payload: CreateAiActionPolicyRequest) => Promise<AiActionPolicy | null>;
  onUpdatePolicy: (
    id: string,
    payload: UpdateAiActionPolicyRequest,
  ) => Promise<AiActionPolicy | null>;
  onTogglePolicyActive: (id: string, next: boolean) => void;
  onDeletePolicy: (id: string) => void;
  onRetry: () => void;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  editing: AiActionPolicy | null;
  openCreate: () => void;
  openEdit: (policy: AiActionPolicy) => void;
  submitCreate: (payload: CreateAiActionPolicyRequest) => void;
  submitUpdate: (payload: UpdateAiActionPolicyRequest) => void;
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
  isCreating: boolean;
  onCreateRule: (
    payload: CreateSuggestionTriggerRuleRequest,
  ) => Promise<SuggestionTriggerRule | null>;
  onUpdateRule: (
    id: string,
    payload: UpdateSuggestionTriggerRuleRequest,
  ) => Promise<SuggestionTriggerRule | null>;
  onToggleRuleActive: (id: string, next: boolean) => void;
  onDeleteRule: (id: string) => void;
  onRetry: () => void;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  editing: SuggestionTriggerRule | null;
  openCreate: () => void;
  openEdit: (rule: SuggestionTriggerRule) => void;
  submitCreate: (payload: CreateSuggestionTriggerRuleRequest) => void;
  submitUpdate: (payload: UpdateSuggestionTriggerRuleRequest) => void;
  t: TranslateFunction;
};

export type AiActionPolicyRowProps = {
  policy: AiActionPolicy;
  onToggleActive: (id: string, next: boolean) => void;
  onEdit: (policy: AiActionPolicy) => void;
  onDelete: (id: string) => void;
  isMutating: boolean;
  t: TranslateFunction;
};

export type SuggestionRuleRowProps = {
  rule: SuggestionTriggerRule;
  onToggleActive: (id: string, next: boolean) => void;
  onEdit: (rule: SuggestionTriggerRule) => void;
  onDelete: (id: string) => void;
  isMutating: boolean;
  t: TranslateFunction;
};

export type UseAiActionPoliciesPageResult = Omit<AdminPolicyPageRenderProps, 't'>;
export type UseSuggestionRulesPageResult = Omit<AdminRulesPageRenderProps, 't'>;

export type PolicyFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AdminFormMode;
  initial: AiActionPolicy | null;
  onSubmitCreate: (payload: CreateAiActionPolicyRequest) => void;
  onSubmitUpdate: (payload: UpdateAiActionPolicyRequest) => void;
  isSubmitting: boolean;
  submitErrorMessage: string | null;
  t: TranslateFunction;
};

export type RuleFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AdminFormMode;
  initial: SuggestionTriggerRule | null;
  onSubmitCreate: (payload: CreateSuggestionTriggerRuleRequest) => void;
  onSubmitUpdate: (payload: UpdateSuggestionTriggerRuleRequest) => void;
  isSubmitting: boolean;
  submitErrorMessage: string | null;
  t: TranslateFunction;
};
