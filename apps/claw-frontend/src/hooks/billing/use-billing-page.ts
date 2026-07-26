import { useCallback } from 'react';

import { useBillingInvoices } from '@/hooks/billing/use-billing-invoices';
import { useBillingPlans } from '@/hooks/billing/use-billing-plans';
import { useBillingUsage } from '@/hooks/billing/use-billing-usage';
import { useBillingViewState } from '@/hooks/billing/use-billing-view-state';
import { useCancelSubscription } from '@/hooks/billing/use-cancel-subscription';
import { useCurrentSubscription } from '@/hooks/billing/use-current-subscription';
import { usePaymentMethods } from '@/hooks/billing/use-payment-methods';
import { usePlanChange } from '@/hooks/billing/use-plan-change';
import { useStartCheckout } from '@/hooks/billing/use-start-checkout';
import { useTranslation } from '@/lib/i18n';
import type { UseBillingPageReturn } from '@/types/billing-hook.types';
import type { BillingPlan } from '@/types/billing.types';
import { isSubscriptionEntitling } from '@/utilities/billing.utility';

// Controller hook for the billing page. It composes the focused hooks and owns
// exactly one decision: whether picking a plan starts a fresh checkout or a
// prorated plan change. Everything else is delegated.
export function useBillingPage(): UseBillingPageReturn {
  const { t } = useTranslation();
  const subscription = useCurrentSubscription();
  const usage = useBillingUsage();
  const invoices = useBillingInvoices();
  const paymentMethods = usePaymentMethods();
  const planChange = usePlanChange();
  const plans = useBillingPlans();
  const checkout = useStartCheckout();
  const cancellation = useCancelSubscription();
  const view = useBillingViewState();

  const hasSubscription = isSubscriptionEntitling(subscription.subscription);

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
    paymentMethods,
    planChange,
    plans,
    checkout,
    cancellation,
    view,
    selectPlan,
    confirmPlanSelection,
    t,
  };
}
