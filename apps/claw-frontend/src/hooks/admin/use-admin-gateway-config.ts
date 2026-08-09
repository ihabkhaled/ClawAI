import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import type { BillingGateway } from '@/enums/billing.enum';
import { useTranslation } from '@/lib/i18n';
import { gatewayConfigRepository } from '@/repositories/admin/gateway-config.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { GatewayConfigUpdate } from '@/types/billing.types';
import type { UseAdminGatewayConfigResult } from '@/types/gateway-config.types';
import { showToast } from '@/utilities';

export function useAdminGatewayConfig(): UseAdminGatewayConfigResult {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [savingGateway, setSavingGateway] = useState<BillingGateway | null>(null);
  const query = useQuery({
    queryKey: queryKeys.gatewayConfig.list(),
    queryFn: () => gatewayConfigRepository.list(),
  });
  const mutation = useMutation({
    mutationFn: (value: { gateway: BillingGateway; input: GatewayConfigUpdate }) =>
      gatewayConfigRepository.update(value.gateway, value.input),
    onMutate: (value) => setSavingGateway(value.gateway),
    onSuccess: () => {
      showToast.success({ description: t('adminGatewayConfig.saved') });
      void client.invalidateQueries({ queryKey: queryKeys.gatewayConfig.all });
    },
    onError: (error: Error) => showToast.apiError(error, t('adminGatewayConfig.saveError')),
    onSettled: () => setSavingGateway(null),
  });
  const save = useCallback(
    (gateway: BillingGateway, input: GatewayConfigUpdate): void =>
      mutation.mutate({ gateway, input }),
    [mutation],
  );
  const retry = useCallback((): void => void query.refetch(), [query]);
  return {
    gateways: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    savingGateway,
    save,
    retry,
    t,
  };
}
