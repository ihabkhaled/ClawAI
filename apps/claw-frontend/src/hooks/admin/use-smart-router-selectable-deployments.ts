import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useModelSizes } from '@/hooks/chat/use-model-sizes';
import { useTranslation } from '@/lib/i18n';
import { smartRouterAdminRepository } from '@/repositories/admin/smart-router-admin.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseSmartRouterSelectableDeploymentsResult } from '@/types/smart-router-admin.types';
import { buildModelScaleText, resolveModelScale } from '@/utilities/model-scale.utility';

/**
 * The models a chain entry may name.
 *
 * The chain's model field used to be free text, and an alias resolves to a
 * deployment exactly or not at all — no family fallback, so the admin page can
 * never show a chain different from the one running. The cost of that
 * strictness is that one retired name produces an entry which is silently
 * skipped on every request, which is how three of four cross-provider entries
 * sat dead for a month. A picker removes the failure mode at the source.
 */
export function useSmartRouterSelectableDeployments(): UseSmartRouterSelectableDeploymentsResult {
  const { t, locale } = useTranslation();
  const { lookup } = useModelSizes();
  const query = useQuery({
    queryKey: queryKeys.smartRouterAdmin.selectableDeployments(),
    queryFn: () => smartRouterAdminRepository.listSelectableDeployments(),
  });
  // The size beside each model id (ADR-234), so an admin choosing a chain entry sees what it is.
  const deployments = useMemo(
    () =>
      (query.data ?? []).map((deployment) => ({
        ...deployment,
        scale: buildModelScaleText(
          resolveModelScale({ entry: lookup(deployment.provider, deployment.providerModelId) }),
          t,
          locale,
        ),
      })),
    [query.data, lookup, t, locale],
  );

  return {
    deployments,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
