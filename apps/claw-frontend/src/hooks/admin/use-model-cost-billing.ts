import { useCallback, useMemo, useState } from 'react';

import { ModelBillingFilter } from '@/enums/model-billing.enum';
import type { ModelBillingInfo } from '@/types/model-billing.types';
import type { ModelCostCatalogRow, UseModelCostBillingResult } from '@/types/model-cost.types';
import { countModelsByBilling, resolveModelBilling } from '@/utilities/model-billing.utility';

import { useProviderCreditPolicy } from './use-provider-credit-policy';

/**
 * Credit vs Included for the Model Prices page, from the same connector policy
 * billing reads. Counts are over the WHOLE catalogue, like the source chips.
 */
export function useModelCostBilling(rows: ModelCostCatalogRow[]): UseModelCostBillingResult {
  const credit = useProviderCreditPolicy();
  const [billingFilter, setBillingFilter] = useState<ModelBillingFilter>(ModelBillingFilter.ALL);
  const counts = useMemo(() => countModelsByBilling(rows, credit.policy), [rows, credit.policy]);
  const resolveBilling = useCallback(
    (row: ModelCostCatalogRow): ModelBillingInfo =>
      resolveModelBilling(row.provider, credit.policy),
    [credit.policy],
  );
  return {
    policy: credit.policy,
    isPolicyError: credit.isError,
    billingFilter,
    setBillingFilter,
    counts,
    resolveBilling,
  };
}
