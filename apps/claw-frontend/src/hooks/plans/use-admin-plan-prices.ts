import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { BillingInterval } from '@/enums/billing.enum';
import { UserRole } from '@/enums/user-role.enum';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import { billingDashboardRepository } from '@/repositories/admin/billing-dashboard.repository';
import { plansRepository } from '@/repositories/admin/plans.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  PublishAdminPlanPriceRequest,
  UseAdminPlanPricesResult,
} from '@/types/admin-plan-price.types';
import { showToast } from '@/utilities';

export function useAdminPlanPrices(): UseAdminPlanPricesResult {
  const params = useParams<{ id: string }>();
  const planId = params.id;
  const { t, locale } = useTranslation();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === UserRole.ADMIN;
  const [billingInterval, setBillingInterval] = useState(BillingInterval.MONTHLY);
  const [currency, setCurrencyState] = useState('USD');
  const [amount, setAmount] = useState('');
  const [saveError, setSaveError] = useState<Error | null>(null);
  const planQuery = useQuery({
    queryKey: queryKeys.adminPlans.detail(planId),
    queryFn: () => plansRepository.get(planId),
    enabled: isAdmin,
  });
  const pricesQuery = useQuery({
    queryKey: queryKeys.adminPlans.prices(planId),
    queryFn: () => plansRepository.listPriceVersions(planId),
    enabled: isAdmin,
  });
  const subscriberCountsQuery = useQuery({
    queryKey: queryKeys.adminBilling.priceVersionCounts(planId),
    queryFn: () => billingDashboardRepository.getPriceVersionSubscriberCounts(planId),
    enabled: isAdmin,
  });
  const subscriberCounts = useMemo(
    () =>
      new Map((subscriberCountsQuery.data ?? []).map((row) => [row.planPriceVersionId, row.count])),
    [subscriberCountsQuery.data],
  );
  const mutation = useMutation({
    mutationFn: (payload: PublishAdminPlanPriceRequest) =>
      plansRepository.publishPrice(planId, payload),
    onSuccess: () => {
      setAmount('');
      setSaveError(null);
      showToast.success({ description: t('adminPlans.updateSucceeded') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminPlans.prices(planId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.publicPricing.all });
    },
    onError: (error: Error) => {
      setSaveError(error);
      showToast.apiError(error, t('adminPlans.updateFailed'));
    },
  });
  const setCurrency = useCallback((value: string): void => {
    setCurrencyState(value.toUpperCase().slice(0, 3));
  }, []);
  const publish = useCallback((): void => {
    const amountMinor = Number(amount);
    if (
      currency.length !== 3 ||
      amount.trim() === '' ||
      !Number.isSafeInteger(amountMinor) ||
      amountMinor < 0
    ) {
      setSaveError(new Error(t('adminPlans.mutationError')));
      return;
    }
    mutation.mutate({ billingInterval, currency, amountMinor });
  }, [amount, billingInterval, currency, mutation, t]);
  const retry = useCallback((): void => {
    void Promise.all([planQuery.refetch(), pricesQuery.refetch(), subscriberCountsQuery.refetch()]);
  }, [planQuery, pricesQuery, subscriberCountsQuery]);
  const error = (planQuery.error ??
    pricesQuery.error ??
    subscriberCountsQuery.error) as Error | null;

  return {
    t,
    locale,
    user: user ?? null,
    plan: planQuery.data ?? null,
    prices: pricesQuery.data ?? [],
    subscriberCounts,
    isLoading: planQuery.isLoading || pricesQuery.isLoading || subscriberCountsQuery.isLoading,
    isError: planQuery.isError || pricesQuery.isError || subscriberCountsQuery.isError,
    error,
    isSaving: mutation.isPending,
    saveError,
    billingInterval,
    currency,
    amount,
    setBillingInterval,
    setCurrency,
    setAmount,
    publish,
    retry,
  };
}
