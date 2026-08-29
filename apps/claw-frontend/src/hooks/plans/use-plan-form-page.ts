import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { ROUTES } from '@/constants/routes.constants';
import { UserRole } from '@/enums';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { usePlanForm } from '@/hooks/plans/use-plan-form';
import { usePlanPaygCreditPreview } from '@/hooks/plans/use-plan-payg-credit-preview';
import { useTranslation } from '@/lib/i18n';
import { plansRepository } from '@/repositories/admin/plans.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  CreatePlanRequest,
  TranslateFunction,
  UpdatePlanRequest,
  UsePlanFormPageResult,
  UserProfile,
} from '@/types';
import { logger, showToast } from '@/utilities';
import { invalidateUserPlanQueries } from '@/utilities/plan-cache.utility';

export function usePlanFormPage(): UsePlanFormPageResult & {
  t: TranslateFunction;
  user: UserProfile | null;
} {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ id?: string }>();
  const planId = params.id ?? null;
  const isEdit = planId !== null;
  const isAdmin = user?.role === UserRole.ADMIN;

  const [submitError, setSubmitError] = useState<Error | null>(null);

  const query = useQuery({
    queryKey:
      planId === null ? queryKeys.adminPlans.detail('new') : queryKeys.adminPlans.detail(planId),
    queryFn: () => {
      if (planId === null) {
        throw new Error('plan id required');
      }
      return plansRepository.get(planId);
    },
    enabled: isAdmin && planId !== null,
    staleTime: 30_000,
  });

  const form = usePlanForm(query.data ?? null);
  const paygCreditPreview = usePlanPaygCreditPreview(planId, form.state.paygCreditPercentBps);

  const goBack = useCallback((): void => {
    router.push(ROUTES.ADMIN_PLANS);
  }, [router]);

  const createMutation = useMutation({
    mutationFn: (payload: CreatePlanRequest) => plansRepository.create(payload),
    onMutate: () => setSubmitError(null),
    onSuccess: () => {
      showToast.success({ description: t('adminPlans.createSucceeded') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminPlans.lists() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.publicPricing.all });
      void invalidateUserPlanQueries(queryClient);
      goBack();
    },
    onError: (err: Error) => {
      setSubmitError(err);
      showToast.apiError(err, t('adminPlans.createFailed'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePlanRequest) => {
      if (planId === null) {
        return Promise.reject(new Error('plan id required'));
      }
      return plansRepository.update(planId, payload);
    },
    onMutate: () => setSubmitError(null),
    onSuccess: () => {
      showToast.success({ description: t('adminPlans.updateSucceeded') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminPlans.lists() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.publicPricing.all });
      void invalidateUserPlanQueries(queryClient);
      if (planId !== null) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.adminPlans.detail(planId) });
      }
      goBack();
    },
    onError: (err: Error) => {
      setSubmitError(err);
      showToast.apiError(err, t('adminPlans.updateFailed'));
    },
  });

  const onSubmit = useCallback((): void => {
    logger.info({
      component: 'admin-plans',
      action: 'submit',
      message: 'Submitting plan form',
      details: { isEdit },
    });
    if (isEdit) {
      const payload = form.buildUpdateRequest();
      if (payload !== null) {
        updateMutation.mutate(payload);
      }
    } else {
      const payload = form.buildCreateRequest();
      if (payload !== null) {
        createMutation.mutate(payload);
      }
    }
  }, [isEdit, form, createMutation, updateMutation]);

  const onCancel = useCallback((): void => goBack(), [goBack]);
  const onRetry = useCallback((): void => {
    void query.refetch();
  }, [query]);

  return {
    t,
    user: user ?? null,
    isEdit,
    plan: query.data ?? null,
    isLoading: isEdit ? query.isLoading : false,
    isError: isEdit ? query.isError : false,
    error: (query.error as Error | null) ?? null,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    submitError,
    form,
    paygCreditPreview,
    onSubmit,
    onCancel,
    onRetry,
  };
}
