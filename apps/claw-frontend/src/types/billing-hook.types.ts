import type {
  BillingPlan,
  BillingUsage,
  CurrentSubscription,
  InvoiceView,
  PaymentMethodView,
  ProrationQuoteView,
} from '@/types/billing.types';

export type UseBillingPlansReturn = {
  plans: BillingPlan[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

export type UseCurrentSubscriptionReturn = {
  // null is a valid, non-error state: a free user has no subscription.
  subscription: CurrentSubscription | null;
  isLoading: boolean;
  isError: boolean;
};

export type UseBillingUsageReturn = {
  usage: BillingUsage | null;
  isLoading: boolean;
  isError: boolean;
};

export type UseStartCheckoutReturn = {
  startCheckout: (input: { planId: string; billingInterval: string; gateway: string }) => void;
  isPending: boolean;
  // Surfaced as a dismissable banner as well as a toast. A silent mutation
  // failure on a payment screen is a delivery blocker.
  error: string | null;
  clearError: () => void;
};

export type UsePlanChangeReturn = {
  quote: ProrationQuoteView | null;
  requestQuote: (input: { targetPlanId: string; billingInterval: string }) => void;
  confirmChange: (gateway: string) => void;
  isQuoting: boolean;
  isConfirming: boolean;
  error: string | null;
  clearError: () => void;
  reset: () => void;
};

export type UseBillingInvoicesReturn = {
  invoices: InvoiceView[];
  isLoading: boolean;
  isError: boolean;
};

export type UsePaymentMethodsReturn = {
  methods: PaymentMethodView[];
  isLoading: boolean;
  isError: boolean;
  remove: (id: string) => void;
  // Per-row, not per-page: a single isMutating flag would disable every row
  // while one is being deleted.
  pendingId: string | null;
  error: string | null;
  clearError: () => void;
};

export type UseBillingPageReturn = {
  subscription: UseCurrentSubscriptionReturn;
  usage: UseBillingUsageReturn;
  invoices: UseBillingInvoicesReturn;
  paymentMethods: UsePaymentMethodsReturn;
  planChange: UsePlanChangeReturn;
  plans: UseBillingPlansReturn;
};
