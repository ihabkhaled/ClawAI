import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { CREDIT_POLICY_QUERY_FILTERS } from '@/constants/model-billing.constants';
import { queryKeys } from '@/repositories/shared/query-keys';
import { fetchAllConnectorsForCreditPolicy } from '@/services/admin/connector-credit-policy.service';
import type { UseProviderCreditPolicyResult } from '@/types/model-billing.types';
import { buildProviderCreditPolicy } from '@/utilities/model-billing.utility';

/**
 * The provider -> credit map billing uses, built client-side from the same
 * GET /connectors the Connectors page reads. Keyed under
 * `queryKeys.connectors.lists()`, so toggling "Credit connector" on a
 * connector refreshes every badge.
 */
export function useProviderCreditPolicy(): UseProviderCreditPolicyResult {
  const query = useQuery({
    queryKey: queryKeys.connectors.list({ ...CREDIT_POLICY_QUERY_FILTERS }),
    queryFn: fetchAllConnectorsForCreditPolicy,
  });
  const policy = useMemo(() => buildProviderCreditPolicy(query.data ?? []), [query.data]);
  return { policy, isLoading: query.isLoading, isError: query.isError };
}
