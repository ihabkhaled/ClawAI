import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { EMPTY_INTERVAL_DISCOUNT_INPUTS } from '@/constants/billing.constants';
import { BillingInterval } from '@/enums/billing.enum';
import { UserRole } from '@/enums/user-role.enum';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import { billingDashboardRepository } from '@/repositories/admin/billing-dashboard.repository';
import { plansRepository } from '@/repositories/admin/plans.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  AdminPlanIntervalDiscounts,
  IntervalDiscountField,
  IntervalDiscountInputs,
  PublishAdminPlanPriceRequest,
  UseAdminPlanPricesResult,
} from '@/types/admin-plan-price.types';
import { showToast } from '@/utilities';
import {
  discountsToInputs,
  parseDiscountPercentToBps,
  parsePlanPriceMajorToMinor,
} from '@/utilities/billing.utility';
import { invalidateUserPlanQueries } from '@/utilities/plan-cache.utility';

export function useAdminPlanPrices(): UseAdminPlanPricesResult {
  const params = useParams<{ id: string }>();
  const planId = params.id;
  const { t, locale } = useTranslation();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === UserRole.ADMIN;
  const [currency, setCurrencyState] = useState('USD');
  const [amount, setAmount] = useState('');
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [discountInputs, setDiscountInputs] = useState<IntervalDiscountInputs>(
    EMPTY_INTERVAL_DISCOUNT_INPUTS,
  );
  const [discountsError, setDiscountsError] = useState<string | null>(null);
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
  const intervalPricingQuery = useQuery({
    queryKey: queryKeys.adminPlans.intervalPricing(planId),
    queryFn: () => plansRepository.getIntervalPricing(planId),
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
  // The fields start from what the server holds, and follow it after a save.
  const serverDiscounts = intervalPricingQuery.data?.discounts;
  useEffect(() => {
    if (serverDiscounts !== undefined) {
      setDiscountInputs(discountsToInputs(serverDiscounts));
    }
  }, [serverDiscounts]);
  const refreshPrices = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminPlans.prices(planId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminPlans.intervalPricing(planId) });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.adminBilling.priceVersionCounts(planId),
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.publicPricing.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.billing.plans() });
    void invalidateUserPlanQueries(queryClient);
  }, [planId, queryClient]);
  const mutation = useMutation({
    mutationFn: (payload: PublishAdminPlanPriceRequest) =>
      plansRepository.publishPrice(planId, payload),
    onSuccess: () => {
      setAmount('');
      setSaveError(null);
      showToast.success({ description: t('adminPlans.updateSucceeded') });
      refreshPrices();
    },
    onError: (error: Error) => {
      setSaveError(error);
      showToast.apiError(error, t('adminPlans.updateFailed'));
    },
  });
  const discountsMutation = useMutation({
    mutationFn: (payload: AdminPlanIntervalDiscounts) =>
      plansRepository.setIntervalDiscounts(planId, payload),
    onSuccess: () => {
      setDiscountsError(null);
      showToast.success({ description: t('adminPlans.intervalDiscounts.saved') });
      refreshPrices();
    },
    onError: (error: Error) => {
      setDiscountsError(error.message);
      showToast.apiError(error, t('adminPlans.updateFailed'));
    },
  });
  const setCurrency = useCallback((value: string): void => {
    setCurrencyState(value);
  }, []);
  const setDiscountInput = useCallback((field: IntervalDiscountField, value: string): void => {
    setDiscountInputs((current) => ({ ...current, [field]: value }));
  }, []);
  // Longer terms are DERIVED from the monthly price and the plan's discounts, so
  // the only price an admin publishes by hand is the monthly one.
  const publish = useCallback((): void => {
    const amountMinor = parsePlanPriceMajorToMinor(amount, currency);
    if (amountMinor === null) {
      setSaveError(new Error(t('adminPlans.mutationError')));
      return;
    }
    mutation.mutate({ billingInterval: BillingInterval.MONTHLY, currency, amountMinor });
  }, [amount, currency, mutation, t]);
  const saveDiscounts = useCallback((): void => {
    const quarterly = parseDiscountPercentToBps(discountInputs.quarterly);
    const semiannual = parseDiscountPercentToBps(discountInputs.semiannual);
    const yearly = parseDiscountPercentToBps(discountInputs.yearly);
    if (quarterly === null || semiannual === null || yearly === null) {
      setDiscountsError(t('adminPlans.intervalDiscounts.invalid'));
      return;
    }
    setDiscountsError(null);
    discountsMutation.mutate({
      quarterlyDiscountBps: quarterly,
      semiannualDiscountBps: semiannual,
      yearlyDiscountBps: yearly,
    });
  }, [discountInputs, discountsMutation, t]);
  const retry = useCallback((): void => {
    void Promise.all([
      planQuery.refetch(),
      pricesQuery.refetch(),
      intervalPricingQuery.refetch(),
      subscriberCountsQuery.refetch(),
    ]);
  }, [planQuery, pricesQuery, intervalPricingQuery, subscriberCountsQuery]);
  const error = (planQuery.error ??
    pricesQuery.error ??
    intervalPricingQuery.error ??
    subscriberCountsQuery.error) as Error | null;

  return {
    t,
    locale,
    user: user ?? null,
    plan: planQuery.data ?? null,
    prices: pricesQuery.data ?? [],
    subscriberCounts,
    isLoading:
      planQuery.isLoading ||
      pricesQuery.isLoading ||
      intervalPricingQuery.isLoading ||
      subscriberCountsQuery.isLoading,
    isError:
      planQuery.isError ||
      pricesQuery.isError ||
      intervalPricingQuery.isError ||
      subscriberCountsQuery.isError,
    error,
    isSaving: mutation.isPending,
    saveError,
    currency,
    amount,
    discountInputs,
    discountsError,
    isSavingDiscounts: discountsMutation.isPending,
    setCurrency,
    setAmount,
    setDiscountInput,
    saveDiscounts,
    publish,
    retry,
  };
}
