'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { BillingGateway } from '@/enums/billing.enum';
import { useBillingGateways } from '@/hooks/billing/use-billing-gateways';
import { useBillingPlans } from '@/hooks/billing/use-billing-plans';
import { useStartCheckout } from '@/hooks/billing/use-start-checkout';
import { useTranslation } from '@/lib/i18n';
import type { UseBillingCheckoutPageReturn } from '@/types/billing-hook.types';
import {
  findPlanPrice,
  formatMinorAmount,
  readCheckoutInterval,
} from '@/utilities/billing.utility';

export function useBillingCheckoutPage(): UseBillingCheckoutPageReturn {
  const searchParams = useSearchParams();
  const { t, locale } = useTranslation();
  const plans = useBillingPlans();
  const gatewayQuery = useBillingGateways();
  const checkout = useStartCheckout();
  const interval = readCheckoutInterval(searchParams.get('interval'));
  const planSlug = searchParams.get('plan');
  const plan = useMemo(
    () => plans.plans.find((item) => item.slug === planSlug) ?? null,
    [planSlug, plans.plans],
  );
  const price = plan === null ? null : findPlanPrice(plan, interval);
  const purchasablePrice = price !== null && price.amountMinor > 0 ? price : null;
  const available = useMemo(
    () => gatewayQuery.gateways.filter((item) => !item.testingSoon),
    [gatewayQuery.gateways],
  );
  const [gateway, setGateway] = useState(BillingGateway.PAYPAL);

  useEffect(() => {
    const first = available.at(0);
    if (first !== undefined && !available.some((item) => item.gateway === gateway)) {
      setGateway(first.gateway);
    }
  }, [available, gateway]);

  const handleCheckout = (): void => {
    if (plan === null || purchasablePrice === null || available.length === 0) {
      return;
    }
    checkout.startCheckout({ planId: plan.id, billingInterval: interval, gateway });
  };

  return {
    t,
    plan,
    formattedPrice:
      purchasablePrice === null
        ? null
        : formatMinorAmount(purchasablePrice.amountMinor, purchasablePrice.currency, locale),
    gateways: gatewayQuery.gateways,
    hasAvailableGateways: available.length > 0,
    gateway,
    setGateway,
    isLoading: plans.isLoading || gatewayQuery.isLoading,
    hasCatalogError: plans.isError || plan === null || purchasablePrice === null,
    canCheckout: plan !== null && purchasablePrice !== null && available.length > 0,
    checkout,
    handleCheckout,
  };
}
