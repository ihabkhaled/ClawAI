import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { UserRole } from '@/enums';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import { plansRepository } from '@/repositories/admin/plans.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  PlanRetirementCandidate,
  TranslateFunction,
  UsePlansPageResult,
  UserProfile,
} from '@/types';
import { logger, showToast } from '@/utilities';
import { invalidateUserPlanQueries } from '@/utilities/plan-cache.utility';

export function usePlansPage(): UsePlansPageResult & {
  t: TranslateFunction;
  user: UserProfile | null;
} {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<Error | null>(null);
  const [retirementCandidate, setRetirementCandidate] = useState<PlanRetirementCandidate | null>(
    null,
  );

  const isAdmin = user?.role === UserRole.ADMIN;

  const query = useQuery({
    queryKey: queryKeys.adminPlans.lists(),
    queryFn: () => plansRepository.list(),
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const invalidate = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminPlans.lists() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.publicPricing.all });
    void invalidateUserPlanQueries(queryClient);
  }, [queryClient]);

  const activateMutation = useMutation({
    mutationFn: (id: string) => plansRepository.activate(id),
    onMutate: (id: string) => {
      setPendingId(id);
      setMutationError(null);
    },
    onSuccess: () => {
      showToast.success({ description: t('adminPlans.activateSucceeded') });
      invalidate();
    },
    onError: (err: Error) => {
      setMutationError(err);
      showToast.apiError(err, t('adminPlans.activateFailed'));
    },
    onSettled: () => setPendingId(null),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => plansRepository.deactivate(id),
    onMutate: (id: string) => {
      setPendingId(id);
      setMutationError(null);
    },
    onSuccess: () => {
      showToast.success({ description: t('adminPlans.deactivateSucceeded') });
      invalidate();
    },
    onError: (err: Error) => {
      setMutationError(err);
      showToast.apiError(err, t('adminPlans.deactivateFailed'));
    },
    onSettled: () => setPendingId(null),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => plansRepository.setDefault(id),
    onMutate: (id: string) => {
      setPendingId(id);
      setMutationError(null);
    },
    onSuccess: () => {
      showToast.success({ description: t('adminPlans.setDefaultSucceeded') });
      invalidate();
    },
    onError: (err: Error) => {
      setMutationError(err);
      showToast.apiError(err, t('adminPlans.setDefaultFailed'));
    },
    onSettled: () => setPendingId(null),
  });

  const retireMutation = useMutation({
    mutationFn: (id: string) => plansRepository.retire(id),
    onMutate: (id: string) => {
      setPendingId(id);
      setMutationError(null);
    },
    onSuccess: () => {
      setRetirementCandidate(null);
      showToast.success({ description: t('common.success') });
      invalidate();
    },
    onError: (err: Error) => {
      setMutationError(err);
      showToast.apiError(err, t('common.error'));
    },
    onSettled: () => setPendingId(null),
  });

  const onActivate = useCallback(
    (id: string): void => {
      logger.info({
        component: 'admin-plans',
        action: 'activate',
        message: 'Activating plan',
        details: { id },
      });
      activateMutation.mutate(id);
    },
    [activateMutation],
  );

  const onDeactivate = useCallback(
    (id: string): void => {
      logger.info({
        component: 'admin-plans',
        action: 'deactivate',
        message: 'Deactivating plan',
        details: { id },
      });
      deactivateMutation.mutate(id);
    },
    [deactivateMutation],
  );

  const onSetDefault = useCallback(
    (id: string): void => {
      logger.info({
        component: 'admin-plans',
        action: 'set-default',
        message: 'Setting default plan',
        details: { id },
      });
      setDefaultMutation.mutate(id);
    },
    [setDefaultMutation],
  );

  const onRequestRetirement = useCallback(
    (plan: PlanRetirementCandidate): void =>
      setRetirementCandidate({ id: plan.id, name: plan.name }),
    [],
  );
  const onCancelRetirement = useCallback((): void => setRetirementCandidate(null), []);
  const onConfirmRetirement = useCallback((): void => {
    if (retirementCandidate !== null) {
      retireMutation.mutate(retirementCandidate.id);
    }
  }, [retireMutation, retirementCandidate]);

  const clearMutationError = useCallback((): void => setMutationError(null), []);
  const onRetry = useCallback((): void => {
    void query.refetch();
  }, [query]);

  return {
    t,
    user: user ?? null,
    plans: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    pendingId,
    mutationError,
    clearMutationError,
    onActivate,
    onDeactivate,
    onSetDefault,
    retirementCandidate,
    onRequestRetirement,
    onCancelRetirement,
    onConfirmRetirement,
    onRetry,
  };
}
