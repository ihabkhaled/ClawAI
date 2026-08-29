import { useCallback, useEffect } from 'react';

import { useBillingGateways } from '@/hooks/billing/use-billing-gateways';
import { useBillingInvoices } from '@/hooks/billing/use-billing-invoices';
import { useBillingPlans } from '@/hooks/billing/use-billing-plans';
import { useBillingUsage } from '@/hooks/billing/use-billing-usage';
import { useBillingViewState } from '@/hooks/billing/use-billing-view-state';
import { useCancelSubscription } from '@/hooks/billing/use-cancel-subscription';
import { useCurrentSubscription } from '@/hooks/billing/use-current-subscription';
import { usePaymentMethods } from '@/hooks/billing/use-payment-methods';
import { usePlanChange } from '@/hooks/billing/use-plan-change';
import { useStartCheckout } from '@/hooks/billing/use-start-checkout';
import { useCreditPage } from '@/hooks/credit/use-credit-page';
import { useTranslation } from '@/lib/i18n';
import type { UseBillingPageReturn } from '@/types/billing-hook.types';
import type { BillingPlan } from '@/types/billing.types';
import { isSubscriptionEntitling } from '@/utilities/billing.utility';

// Controller hook for the billing page. It composes the focused hooks and owns
// exactly one decision: whether picking a plan starts a fresh checkout or a
// prorated plan change. Everything else is delegated.
export function useBillingPage(): UseBillingPageReturn {
  const { t, locale } = useTranslation();
  // /billing shows the balance and the ledger; /plan owns the primary "Add
  // credit" button. Both read the same wallet query, so the two pages can never
  // disagree about what is left.
  const credit = useCreditPage();
  const subscription = useCurrentSubscription();
  const usage = useBillingUsage();
  const invoices = useBillingInvoices();
  const gateways = useBillingGateways();
  const paymentMethods = usePaymentMethods();
  const planChange = usePlanChange();
  const plans = useBillingPlans();
  const checkout = useStartCheckout();
  const cancellation = useCancelSubscription();
  const view = useBillingViewState();
  const { closePlanChange, setIsCancelOpen, setIsEndNowOpen } = view;

  useEffect(() => {
    const first = gateways.gateways[0];
    if (first !== undefined && !gateways.gateways.some((item) => item.gateway === view.gateway)) {
      view.setGateway(first.gateway);
    }
  }, [gateways.gateways, view]);

  const hasSubscription = isSubscriptionEntitling(subscription.subscription);

  useEffect(() => {
    if (
      checkout.gatewaySession !== null ||
      planChange.gatewaySession !== null ||
      paymentMethods.gatewaySession !== null
    ) {
      closePlanChange();
    }
  }, [
    checkout.gatewaySession,
    paymentMethods.gatewaySession,
    planChange.gatewaySession,
    closePlanChange,
  ]);

  useEffect(() => {
    if (subscription.subscription?.cancelAtPeriodEnd === true && !cancellation.isCancelPending) {
      setIsCancelOpen(false);
    }
  }, [cancellation.isCancelPending, subscription.subscription?.cancelAtPeriodEnd, setIsCancelOpen]);

  useEffect(() => {
    if (subscription.subscription === null && !cancellation.isEndNowPending) {
      setIsEndNowOpen(false);
    }
  }, [cancellation.isEndNowPending, setIsEndNowOpen, subscription.subscription]);

  const selectPlan = useCallback(
    (plan: BillingPlan) => {
      view.openPlanChange(plan);
      // An existing subscriber must see the prorated amount BEFORE anything is
      // charged, so selection only asks for a quote here. A user with no
      // subscription has nothing to prorate against and goes straight to the
      // gateway on confirm.
      if (hasSubscription) {
        planChange.requestQuote({ targetPlanId: plan.id, billingInterval: view.interval });
      }
    },
    [hasSubscription, planChange, view],
  );

  const confirmPlanSelection = useCallback(() => {
    if (view.targetPlan === null) {
      return;
    }
    if (hasSubscription) {
      planChange.confirmChange(view.gateway);
      return;
    }
    checkout.startCheckout({
      planId: view.targetPlan.id,
      billingInterval: view.interval,
      gateway: view.gateway,
    });
  }, [checkout, hasSubscription, planChange, view]);

  return {
    subscription,
    usage,
    invoices,
    gateways,
    paymentMethods,
    planChange,
    plans,
    checkout,
    cancellation,
    view,
    credit,
    selectPlan,
    confirmPlanSelection,
    t,
    locale,
  };
}
