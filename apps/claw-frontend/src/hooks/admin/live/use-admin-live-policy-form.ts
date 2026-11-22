import { useCallback, useEffect, useState } from 'react';

import type { LivePlanField, LivePolicyFlag, LivePolicyNumberField } from '@/enums/live.enum';
import type {
  LivePolicyFormValues,
  LivePolicyVersion,
  UseAdminLivePolicyFormResult,
} from '@/types/live-admin.types';
import {
  liveFormValuesToPolicy,
  livePolicyToFormValues,
} from '@/utilities/live-policy-form.utility';

/** Form state for the policy editor, re-seeded whenever a new active version arrives. */
export function useAdminLivePolicyForm(
  policy: LivePolicyVersion | null,
): UseAdminLivePolicyFormResult {
  const [values, setValues] = useState<LivePolicyFormValues | null>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);

  useEffect(() => {
    setValues(policy === null ? null : livePolicyToFormValues(policy.config));
    setInvalidField(null);
  }, [policy]);
  const update = useCallback((patch: Partial<LivePolicyFormValues>): void => {
    setValues((current) => (current === null ? current : { ...current, ...patch }));
    setInvalidField(null);
  }, []);
  const setPlan = useCallback((plan: string, field: LivePlanField, value: string): void => {
    setValues((current) => {
      if (current === null) {
        return current;
      }
      if (plan === '') {
        return { ...current, defaultPlan: { ...current.defaultPlan, [field]: value } };
      }
      const plans = current.plans.map((row) =>
        row.plan === plan ? { ...row, [field]: value } : row,
      );
      return { ...current, plans };
    });
    setInvalidField(null);
  }, []);
  const build = useCallback(() => {
    if (values === null || policy === null) {
      return null;
    }
    const result = liveFormValuesToPolicy(values, policy.config);
    setInvalidField(result.invalidField);
    return result;
  }, [policy, values]);

  return {
    values,
    invalidField,
    setFlag: (field: LivePolicyFlag, value: boolean) => update({ [field]: value }),
    setNumber: (field: LivePolicyNumberField, value: string) => update({ [field]: value }),
    setPlan,
    setNote: (note: string) => update({ note }),
    build,
  };
}
