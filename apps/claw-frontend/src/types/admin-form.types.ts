import type { AiActionPolicyKind } from '@/enums/ai-action-policy-kind.enum';
import type { RiskLabel } from '@/enums/risk-label.enum';

import type {
  CreateAiActionPolicyRequest,
  CreateSuggestionTriggerRuleRequest,
  UpdateAiActionPolicyRequest,
  UpdateSuggestionTriggerRuleRequest,
} from './ai-action-policy.types';

export type PolicyFormState = {
  name: string;
  kind: AiActionPolicyKind;
  description: string;
  providerRegex: string;
  actionKindRegex: string;
  riskMaxLabel: RiskLabel;
  riskMaxScore: string;
  priority: string;
  requireReason: boolean;
  isActive: boolean;
};

export type PolicyFormFieldErrors = Partial<Record<keyof PolicyFormState, string>>;

export type UsePolicyFormResult = {
  state: PolicyFormState;
  setField: <K extends keyof PolicyFormState>(field: K, value: PolicyFormState[K]) => void;
  fieldErrors: PolicyFormFieldErrors;
  reset: () => void;
  buildCreateRequest: () => CreateAiActionPolicyRequest | null;
  buildUpdateRequest: () => UpdateAiActionPolicyRequest | null;
};

export type RuleFormState = {
  name: string;
  description: string;
  eventType: string;
  providerRegex: string;
  contentRegex: string;
  actionKindToSuggest: string;
  priority: string;
  isActive: boolean;
};

export type RuleFormFieldErrors = Partial<Record<keyof RuleFormState, string>>;

export type UseRuleFormResult = {
  state: RuleFormState;
  setField: <K extends keyof RuleFormState>(field: K, value: RuleFormState[K]) => void;
  fieldErrors: RuleFormFieldErrors;
  reset: () => void;
  buildCreateRequest: () => CreateSuggestionTriggerRuleRequest | null;
  buildUpdateRequest: () => UpdateSuggestionTriggerRuleRequest | null;
};
