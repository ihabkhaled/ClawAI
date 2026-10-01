import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { PLAN_TRIAL_DURATION_DAYS } from '@/constants/plan.constants';
import { useTranslation } from '@/lib/i18n';
import { plansRepository } from '@/repositories/admin/plans.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  TrialDaysActionForm,
  TrialDaysActionRunner,
  UseUserTrialActionsReturn,
} from '@/types/admin-user-statistics.types';
import {
  parseTrialActionDays,
  resolveFreeTrialPlan,
  resolveTrialActionErrorKey,
} from '@/utilities/admin-trial-actions.utility';
import { showToast } from '@/utilities/toast.utility';

// One reasoned-days form. The value is only validated on submit, so a half-typed
// number never flashes an error; `errorKey` stays null until the first attempt.
function useTrialDaysForm(run: TrialDaysActionRunner, isPending: boolean): TrialDaysActionForm {
  const [days, setDays] = useState(String(PLAN_TRIAL_DURATION_DAYS));
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);

  const validationKey = resolveTrialActionErrorKey(days, reason);

  const submit = (): void => {
    setAttempted(true);
    const parsed = parseTrialActionDays(days);
    if (validationKey !== null || parsed === null) {
      return;
    }
    run(parsed, reason.trim(), () => {
      setReason('');
      setAttempted(false);
    });
  };

  return {
    days,
    reason,
    errorKey: attempted ? validationKey : null,
    isPending,
    setDays,
    setReason,
    submit,
  };
}

/**
 * "Add trial days" and "Set to Free for N days" for the admin subscription dialog.
 *
 * Both refetch the plan overview afterwards, so the remaining-days badge the admin
 * is looking at moves as soon as the call lands.
 */
export function useUserTrialActions(userId: string): UseUserTrialActionsReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const plansQuery = useQuery({
    queryKey: queryKeys.adminPlans.lists(),
    queryFn: () => plansRepository.list(),
  });
  const freePlan = resolveFreeTrialPlan(plansQuery.data ?? []);

  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.userPlanOverview(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
  };

  const addMutation = useMutation({
    mutationFn: ({ days, reason }: { days: number; reason: string }) =>
      plansRepository.addTrialDays(userId, days, reason),
    onSuccess: (result, variables) => {
      refresh();
      showToast.success({
        description: t('admin.addTrialDaysSuccess', {
          days: variables.days,
          remaining: result.daysRemaining,
        }),
      });
    },
    onError: (err: unknown) => {
      showToast.apiError(err, t('admin.addTrialDaysFailed'), { translate: t });
    },
  });

  const setFreeMutation = useMutation({
    mutationFn: ({ days, reason }: { days: number; reason: string }) => {
      if (freePlan === null) {
        return Promise.reject(new Error(t('admin.setFreeFailed')));
      }
      return plansRepository.assignUserForDays(userId, freePlan.id, days, reason);
    },
    onSuccess: (_plan, variables) => {
      refresh();
      showToast.success({ description: t('admin.setFreeSuccess', { days: variables.days }) });
    },
    onError: (err: unknown) => {
      showToast.apiError(err, t('admin.setFreeFailed'), { translate: t });
    },
  });

  const addDays = useTrialDaysForm(
    (days, reason, onDone) => addMutation.mutate({ days, reason }, { onSuccess: onDone }),
    addMutation.isPending,
  );
  const setFree = useTrialDaysForm(
    (days, reason, onDone) => setFreeMutation.mutate({ days, reason }, { onSuccess: onDone }),
    setFreeMutation.isPending,
  );

  return { freePlanName: freePlan?.name ?? null, addDays, setFree };
}
