import { useCallback, useState } from 'react';

import { CREDIT_PACKAGE_FORM_DEFAULTS } from '@/constants/credit.constants';
import type { UseCreditPackageFormReturn } from '@/types/credit-hook.types';
import type {
  CreateCreditPackageRequest,
  CreditPackageFormErrors,
  CreditPackageFormState,
  PublishCreditPackageVersionRequest,
} from '@/types/credit.types';
import {
  parseCreditPackageCreate,
  parseCreditPackageVersion,
} from '@/utilities/credit-form.utility';

// Controlled state for the admin package editor.
//
// Two build functions rather than one, because creating a package and pricing it
// are two facts: the package is an identity that lives forever, the price is an
// immutable version. Merging them into one request would be a shape that can
// rewrite a published price.
export function useCreditPackageForm(): UseCreditPackageFormReturn {
  const [state, setState] = useState<CreditPackageFormState>(CREDIT_PACKAGE_FORM_DEFAULTS);
  const [fieldErrors, setFieldErrors] = useState<CreditPackageFormErrors>({});

  const setField = useCallback(
    <K extends keyof CreditPackageFormState>(field: K, value: CreditPackageFormState[K]): void => {
      setState((prev) => ({ ...prev, [field]: value }));
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    [],
  );

  const buildCreateRequest = useCallback((): CreateCreditPackageRequest | null => {
    const parsed = parseCreditPackageCreate(state);
    setFieldErrors(parsed.errors);
    return parsed.value;
  }, [state]);

  const buildVersionRequest = useCallback((): PublishCreditPackageVersionRequest | null => {
    const parsed = parseCreditPackageVersion(state);
    setFieldErrors(parsed.errors);
    return parsed.value;
  }, [state]);

  const reset = useCallback((): void => {
    setState(CREDIT_PACKAGE_FORM_DEFAULTS);
    setFieldErrors({});
  }, []);

  return { state, setField, fieldErrors, buildCreateRequest, buildVersionRequest, reset };
}
