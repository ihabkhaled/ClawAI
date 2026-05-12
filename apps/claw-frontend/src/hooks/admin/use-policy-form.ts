import { useCallback, useEffect, useState } from 'react';

import { AiActionPolicyKind } from '@/enums/ai-action-policy-kind.enum';
import { RiskLabel } from '@/enums/risk-label.enum';
import { createAiActionPolicySchema } from '@/lib/validation/admin-automation.schema';
import type {
  PolicyFormFieldErrors,
  PolicyFormState,
  UsePolicyFormResult,
} from '@/types/admin-form.types';
import type {
  AiActionPolicy,
  CreateAiActionPolicyRequest,
  UpdateAiActionPolicyRequest,
} from '@/types/ai-action-policy.types';

const emptyState = (): PolicyFormState => ({
  name: '',
  kind: AiActionPolicyKind.ALLOW,
  description: '',
  providerRegex: '.*',
  actionKindRegex: '.*',
  riskMaxLabel: RiskLabel.LOW,
  riskMaxScore: '30',
  priority: '500',
  requireReason: false,
  isActive: true,
});

const fromPolicy = (policy: AiActionPolicy): PolicyFormState => ({
  name: policy.name,
  kind: policy.kind,
  description: policy.description ?? '',
  providerRegex: policy.providerRegex,
  actionKindRegex: policy.actionKindRegex,
  riskMaxLabel: policy.riskMaxLabel,
  riskMaxScore: String(policy.riskMaxScore),
  priority: String(policy.priority),
  requireReason: policy.requireReason,
  isActive: policy.isActive,
});

export function usePolicyForm(initial: AiActionPolicy | null): UsePolicyFormResult {
  const [state, setState] = useState<PolicyFormState>(() =>
    initial ? fromPolicy(initial) : emptyState(),
  );
  const [fieldErrors, setFieldErrors] = useState<PolicyFormFieldErrors>({});

  useEffect(() => {
    setState(initial ? fromPolicy(initial) : emptyState());
    setFieldErrors({});
  }, [initial]);

  const setField = useCallback(
    <K extends keyof PolicyFormState>(field: K, value: PolicyFormState[K]): void => {
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
    setState(initial ? fromPolicy(initial) : emptyState());
    setFieldErrors({});
  }, [initial]);

  const validate = useCallback(():
    | { ok: true; value: ReturnType<typeof createAiActionPolicySchema.parse> }
    | { ok: false } => {
    const result = createAiActionPolicySchema.safeParse({
      name: state.name,
      kind: state.kind,
      description: state.description.length === 0 ? undefined : state.description,
      providerRegex: state.providerRegex,
      actionKindRegex: state.actionKindRegex,
      riskMaxLabel: state.riskMaxLabel,
      riskMaxScore: state.riskMaxScore,
      priority: state.priority,
      requireReason: state.requireReason,
      isActive: state.isActive,
    });
    if (result.success) {
      return { ok: true, value: result.data };
    }
    const errors: PolicyFormFieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof PolicyFormState;
      if (errors[key] === undefined) {
        errors[key] = issue.message;
      }
    }
    setFieldErrors(errors);
    return { ok: false };
  }, [state]);

  const buildCreateRequest = useCallback((): CreateAiActionPolicyRequest | null => {
    const result = validate();
    if (!result.ok) {
      return null;
    }
    return result.value;
  }, [validate]);

  const buildUpdateRequest = useCallback((): UpdateAiActionPolicyRequest | null => {
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
