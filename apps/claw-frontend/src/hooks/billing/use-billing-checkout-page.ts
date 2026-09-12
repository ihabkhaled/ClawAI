'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { BillingGateway } from '@/enums/billing.enum';
import { useBillingGateways } from '@/hooks/billing/use-billing-gateways';
import { useBillingPlans } from '@/hooks/billing/use-billing-plans';
import { useStartCheckout } from '@/hooks/billing/use-start-checkout';
import { useLocalizedMoney } from '@/hooks/display-currency/use-localized-money';
import { useMoneyFormatter } from '@/hooks/display-currency/use-money-formatter';
import { useTranslation } from '@/lib/i18n';
import type { UseBillingCheckoutPageReturn } from '@/types/billing-hook.types';
import {
  buildChargeNotice,
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

  const localizedPrice = useLocalizedMoney(
    purchasablePrice?.amountMinor ?? 0,
    purchasablePrice?.currency ?? 'USD',
  );
  const formatMoney = useMoneyFormatter();
  const selectedGateway = gatewayQuery.gateways.find((item) => item.gateway === gateway) ?? null;

  const handleCheckout = (): void => {
    if (plan === null || purchasablePrice === null || available.length === 0) {
      return;
    }
    checkout.startCheckout({ planId: plan.id, billingInterval: interval, gateway });
  };

  return {
    t,
    plan,
    // The ESTIMATE, in the visitor's currency.
    formattedPrice: purchasablePrice === null ? null : localizedPrice.text,
    // What the selected gateway will actually charge, stated separately and
    // never derived from the estimate above. Paymob's exact EGP total comes
    // from the server's own settlement quote when the session is created, and
    // it will differ from this figure: that quote is newer, carries the safety
    // margin, and is not commercially rounded. That is not a bug, which is why
    // the copy calls this line the charge CURRENCY, not the charge amount.
    settlementCurrency: selectedGateway?.settlementCurrency ?? null,
    canonicalPrice:
      purchasablePrice === null
        ? null
        : formatMoney(purchasablePrice.amountMinor, purchasablePrice.currency),
    // Two different promises, so two different sentences.
    //
    // A gateway that settles in the plan's own currency can be quoted exactly,
    // because that amount IS the canonical price. One that converts cannot: its
    // total comes from the server's settlement quote when the session is
    // created, and that quote is newer, carries the safety margin and is not
    // commercially rounded. Naming an amount here would be a number ClawAI has
    // not computed yet.
    chargeNotice:
      purchasablePrice === null
        ? null
        : buildChargeNotice(
            selectedGateway?.settlementCurrency ?? null,
            purchasablePrice.currency,
            formatMinorAmount(purchasablePrice.amountMinor, purchasablePrice.currency, locale),
          ),
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
