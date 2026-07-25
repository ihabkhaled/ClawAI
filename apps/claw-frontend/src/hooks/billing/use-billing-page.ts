import { useBillingInvoices } from '@/hooks/billing/use-billing-invoices';
import { useBillingPlans } from '@/hooks/billing/use-billing-plans';
import { useBillingUsage } from '@/hooks/billing/use-billing-usage';
import { useCurrentSubscription } from '@/hooks/billing/use-current-subscription';
import { usePaymentMethods } from '@/hooks/billing/use-payment-methods';
import { usePlanChange } from '@/hooks/billing/use-plan-change';
import type { UseBillingPageReturn } from '@/types/billing-hook.types';

// Controller hook for the billing page. It composes the focused hooks and holds
// no logic of its own — the page calls exactly this one hook, per the frontend
// architecture rules.
export function useBillingPage(): UseBillingPageReturn {
  return {
    subscription: useCurrentSubscription(),
    usage: useBillingUsage(),
    invoices: useBillingInvoices(),
    paymentMethods: usePaymentMethods(),
    planChange: usePlanChange(),
    plans: useBillingPlans(),
  };
}
