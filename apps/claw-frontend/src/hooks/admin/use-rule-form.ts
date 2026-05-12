import { useCallback, useEffect, useState } from 'react';

import { createSuggestionRuleSchema } from '@/lib/validation/admin-automation.schema';
import type {
  RuleFormFieldErrors,
  RuleFormState,
  UseRuleFormResult,
} from '@/types/admin-form.types';
import type {
  CreateSuggestionTriggerRuleRequest,
  SuggestionTriggerRule,
  UpdateSuggestionTriggerRuleRequest,
} from '@/types/ai-action-policy.types';

const emptyState = (): RuleFormState => ({
  name: '',
  description: '',
  eventType: 'workspace.webhook.received',
  providerRegex: '.*',
  contentRegex: '.*',
  actionKindToSuggest: 'SUMMARIZE',
  priority: '100',
  isActive: true,
});

const fromRule = (rule: SuggestionTriggerRule): RuleFormState => ({
  name: rule.name,
  description: rule.description ?? '',
  eventType: rule.eventType,
  providerRegex: rule.providerRegex,
  contentRegex: rule.contentRegex,
  actionKindToSuggest: rule.actionKindToSuggest,
  priority: String(rule.priority),
  isActive: rule.isActive,
});

export function useRuleForm(initial: SuggestionTriggerRule | null): UseRuleFormResult {
  const [state, setState] = useState<RuleFormState>(() =>
    initial ? fromRule(initial) : emptyState(),
  );
  const [fieldErrors, setFieldErrors] = useState<RuleFormFieldErrors>({});

  useEffect(() => {
    setState(initial ? fromRule(initial) : emptyState());
    setFieldErrors({});
  }, [initial]);

  const setField = useCallback(
    <K extends keyof RuleFormState>(field: K, value: RuleFormState[K]): void => {
      setState((prev) => ({ ...prev, [field]: value }));
      setFieldErrors((prev) => {
        if (prev[field] === undefined) {
          return prev;
        }
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const reset = useCallback((): void => {
    setState(initial ? fromRule(initial) : emptyState());
    setFieldErrors({});
  }, [initial]);

  const validate = useCallback(():
    | { ok: true; value: ReturnType<typeof createSuggestionRuleSchema.parse> }
    | { ok: false } => {
    const result = createSuggestionRuleSchema.safeParse({
      name: state.name,
      description: state.description.length === 0 ? undefined : state.description,
      eventType: state.eventType,
      providerRegex: state.providerRegex.length === 0 ? undefined : state.providerRegex,
      contentRegex: state.contentRegex.length === 0 ? undefined : state.contentRegex,
      actionKindToSuggest: state.actionKindToSuggest,
      priority: state.priority.length === 0 ? undefined : state.priority,
      isActive: state.isActive,
    });
    if (result.success) {
      return { ok: true, value: result.data };
    }
    const errors: RuleFormFieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof RuleFormState;
      if (errors[key] === undefined) {
        errors[key] = issue.message;
      }
    }
    setFieldErrors(errors);
    return { ok: false };
  }, [state]);

  const buildCreateRequest = useCallback((): CreateSuggestionTriggerRuleRequest | null => {
    const result = validate();
    if (!result.ok) {
      return null;
    }
    return result.value;
  }, [validate]);

  const buildUpdateRequest = useCallback((): UpdateSuggestionTriggerRuleRequest | null => {
    const result = validate();
    if (!result.ok) {
      return null;
    }
    const { name: _ignored, ...rest } = result.value;
    void _ignored;
    return rest;
  }, [validate]);

  return { state, setField, fieldErrors, reset, buildCreateRequest, buildUpdateRequest };
}
