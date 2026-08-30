import { useCallback, useState } from 'react';

import type { CostClass } from '@/enums/router-models.enum';
import { useTranslation } from '@/lib/i18n';
import type {
  ModelCostCatalogRow,
  ModelCostFormState,
  PublishModelCostRequest,
  UseModelCostFormResult,
} from '@/types/model-cost.types';
import {
  buildModelCostFormState,
  buildPublishModelCostRequest,
  isModelCostFormValid,
  resolveModelCostFormErrors,
} from '@/utilities/model-cost-form.utility';

/**
 * The edit dialog's fields.
 *
 * Seeded ONCE from the row, so the component that renders it must be keyed on
 * the model — reopening the dialog on a different model would otherwise show
 * the previous model's rates and publish them under the new key.
 */
export function useModelCostForm(row: ModelCostCatalogRow | null): UseModelCostFormResult {
  const { t } = useTranslation();
  const [state, setState] = useState<ModelCostFormState>(() => buildModelCostFormState(row));

  const setInputDollarsPerMillion = useCallback((value: string): void => {
    setState((previous) => ({ ...previous, inputDollarsPerMillion: value }));
  }, []);

  const setOutputDollarsPerMillion = useCallback((value: string): void => {
    setState((previous) => ({ ...previous, outputDollarsPerMillion: value }));
  }, []);

  const setCachedInputDollarsPerMillion = useCallback((value: string): void => {
    setState((previous) => ({ ...previous, cachedInputDollarsPerMillion: value }));
  }, []);

  const setCostClass = useCallback((value: CostClass): void => {
    setState((previous) => ({ ...previous, costClass: value }));
  }, []);

  const errors = resolveModelCostFormErrors(state, t);
  const isValid = isModelCostFormValid(errors);

  const buildRequest = useCallback(
    (): PublishModelCostRequest | null => buildPublishModelCostRequest(row, state, t),
    [row, state, t],
  );

  return {
    state,
    errors,
    isValid,
    setInputDollarsPerMillion,
    setOutputDollarsPerMillion,
    setCachedInputDollarsPerMillion,
    setCostClass,
    buildRequest,
  };
}
