import { useCallback, useState } from 'react';

import { CREDIT_ADJUSTMENT_FORM_DEFAULTS } from '@/constants/credit.constants';
import type { UseCreditAdjustmentFormReturn } from '@/types/credit-hook.types';
import type {
  AdjustCreditRequest,
  CreditAdjustmentFormErrors,
  CreditAdjustmentFormState,
} from '@/types/credit.types';
import { parseCreditAdjustment } from '@/utilities/credit-form.utility';

// Controlled state for an operator credit or debit.
//
// The reason is a required field with a real minimum length, not a courtesy: an
// unattributed adjustment is indistinguishable from a fabricated payment when
// finance later asks where a balance came from.
export function useCreditAdjustmentForm(): UseCreditAdjustmentFormReturn {
  const [state, setState] = useState<CreditAdjustmentFormState>(CREDIT_ADJUSTMENT_FORM_DEFAULTS);
  const [fieldErrors, setFieldErrors] = useState<CreditAdjustmentFormErrors>({});

  const setField = useCallback(
    <K extends keyof CreditAdjustmentFormState>(
      field: K,
      value: CreditAdjustmentFormState[K],
    ): void => {
      setState((prev) => ({ ...prev, [field]: value }));
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    [],
  );

  const buildRequest = useCallback((): AdjustCreditRequest | null => {
    const parsed = parseCreditAdjustment(state);
    setFieldErrors(parsed.errors);
    return parsed.value;
  }, [state]);

  const reset = useCallback((): void => {
    setState(CREDIT_ADJUSTMENT_FORM_DEFAULTS);
    setFieldErrors({});
  }, []);

  return { state, setField, fieldErrors, buildRequest, reset };
}
