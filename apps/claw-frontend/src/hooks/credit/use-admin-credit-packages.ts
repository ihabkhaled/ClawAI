import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { CREDIT_PACKAGES_STALE_MS } from '@/constants/credit.constants';
import { useTranslation } from '@/lib/i18n';
import { adminCreditRepository } from '@/repositories/admin/credit.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseAdminCreditPackagesReturn } from '@/types/credit-hook.types';
import type {
  CreateCreditPackageRequest,
  PublishCreditPackageVersionRequest,
} from '@/types/credit.types';
import { resolveBillingErrorMessage } from '@/utilities/billing-error.utility';
import { showToast } from '@/utilities/toast.utility';

// The operator's view of the top-up catalog.
//
// `pendingPackageId` is per row rather than a single page-wide flag: publishing a
// price for one package must not grey out every other row, which reads as the
// whole screen being broken.
export function useAdminCreditPackages(): UseAdminCreditPackagesReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pendingPackageId, setPendingPackageId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.adminCredit.packages(),
    queryFn: () => adminCreditRepository.listPackages(),
    staleTime: CREDIT_PACKAGES_STALE_MS,
  });

  const onFailure = useCallback(
    (mutationError: unknown): void => {
      const message = resolveBillingErrorMessage(
        mutationError,
        t,
        t('adminBilling.credit.saveFailed'),
      );
      setError(message);
      showToast.error({ title: t('billing.error.title'), description: message });
    },
    [t],
  );

  const onSettled = useCallback(async (): Promise<void> => {
    setPendingPackageId(null);
    await queryClient.invalidateQueries({ queryKey: queryKeys.adminCredit.all });
    // The user-facing catalog reads the same rows, so it is stale the moment a
    // new version is published.
    await queryClient.invalidateQueries({ queryKey: queryKeys.credit.packages() });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateCreditPackageRequest) =>
      adminCreditRepository.createPackage(payload),
    onSuccess: () => {
      setError(null);
      showToast.success({ title: t('adminBilling.credit.packageCreated') });
    },
    onError: onFailure,
    onSettled,
  });

  const publishMutation = useMutation({
    mutationFn: (input: { packageId: string; payload: PublishCreditPackageVersionRequest }) =>
      adminCreditRepository.publishVersion(input.packageId, input.payload),
    onSuccess: () => {
      setError(null);
      showToast.success({ title: t('adminBilling.credit.versionPublished') });
    },
    onError: onFailure,
    onSettled,
  });

  const publishVersion = useCallback(
    (packageId: string, payload: PublishCreditPackageVersionRequest): void => {
      setPendingPackageId(packageId);
      publishMutation.mutate({ packageId, payload });
    },
    [publishMutation],
  );

  return {
    packages: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    createPackage: createMutation.mutate,
    publishVersion,
    isCreatePending: createMutation.isPending,
    pendingPackageId,
    error,
    clearError: useCallback(() => {
      setError(null);
    }, []),
  };
}
