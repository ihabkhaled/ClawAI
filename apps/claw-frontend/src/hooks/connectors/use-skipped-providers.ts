import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { SKIPPED_PROVIDERS_REFETCH_INTERVAL_MS } from '@/constants/admin.constants';
import { UserRole } from '@/enums';
import { ProviderBreakerSource } from '@/enums/provider-breaker-source.enum';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import { providerBreakerRepository } from '@/repositories/admin/provider-breaker.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { Connector } from '@/types/connector.types';
import type { UseSkippedProvidersReturn } from '@/types/provider-breaker.types';
import { showToast } from '@/utilities';
import { buildSkippedProviderRows } from '@/utilities/skipped-providers.utility';

/**
 * Providers chat-service's credit breaker is skipping, plus the admin
 * "clear" (ADR-125 addendum). ADMIN only: anyone else never fires the query
 * (the endpoint would answer 403) and the section is not rendered.
 */
export function useSkippedProviders(connectors: readonly Connector[]): UseSkippedProvidersReturn {
  const { user } = useCurrentUser();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isVisible = user?.role === UserRole.ADMIN;

  const query = useQuery({
    queryKey: queryKeys.admin.providerBreakers,
    queryFn: () => providerBreakerRepository.list(),
    refetchInterval: SKIPPED_PROVIDERS_REFETCH_INTERVAL_MS,
    enabled: isVisible,
  });

  const mutation = useMutation({
    mutationFn: (provider: string) => providerBreakerRepository.clear(provider),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.providerBreakers });
      showToast.success({ title: t('skippedProviders.cleared') });
    },
    onError: (error: Error) => {
      showToast.apiError(error, t('skippedProviders.clearFailed'));
    },
  });

  const providers = query.data?.providers;
  const rows = useMemo(
    () => buildSkippedProviderRows(providers ?? [], connectors, t),
    [providers, connectors, t],
  );

  return {
    isVisible,
    rows,
    isLoading: query.isLoading,
    isError: query.isError,
    isPartial: query.data?.source === ProviderBreakerSource.MEMORY,
    clearingProvider: mutation.isPending ? (mutation.variables ?? null) : null,
    clear: mutation.mutate,
  };
}
