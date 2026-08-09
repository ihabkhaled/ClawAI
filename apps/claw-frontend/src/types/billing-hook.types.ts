import type { BillingGateway, BillingInterval, BillingReturnPhase } from '@/enums/billing.enum';
import type {
  BillingPlan,
  BillingUsage,
  CheckoutGatewayView,
  CurrentSubscription,
  InvoiceView,
  PaymentMethodView,
  ProrationQuoteView,
  GatewayCheckoutSession,
} from '@/types/billing.types';
import type { TranslateFunction } from '@/types/i18n.types';

export type UseBillingPlansReturn = {
  plans: BillingPlan[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

export type UseBillingGatewaysReturn = {
  gateways: CheckoutGatewayView[];
  isLoading: boolean;
  isError: boolean;
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
  startCheckout: (input: CheckoutStartInput) => void;
  isPending: boolean;
  // Surfaced as a dismissable banner as well as a toast. A silent mutation
  // failure on a payment screen is a delivery blocker.
  error: string | null;
  clearError: () => void;
  gatewaySession: GatewayCheckoutSession | null;
  closeGateway: () => void;
  completeGateway: () => Promise<void>;
};

export type CheckoutStartInput = {
  planId: string;
  billingInterval: string;
  gateway: string;
};

export type CheckoutMutationInput = CheckoutStartInput & {
  idempotencyKey: string;
};

export type UseBillingCheckoutPageReturn = {
  t: TranslateFunction;
  plan: BillingPlan | null;
  formattedPrice: string | null;
  gateways: CheckoutGatewayView[];
  hasAvailableGateways: boolean;
  gateway: BillingGateway;
  setGateway: (gateway: BillingGateway) => void;
  isLoading: boolean;
  hasCatalogError: boolean;
  canCheckout: boolean;
  checkout: UseStartCheckoutReturn;
  handleCheckout: () => void;
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
  gatewaySession: GatewayCheckoutSession | null;
  closeGateway: () => void;
  completeGateway: () => Promise<void>;
};

export type UseBillingInvoicesReturn = {
  invoices: InvoiceView[];
  isLoading: boolean;
  isError: boolean;
  download: (id: string, number: string) => void;
  pendingId: string | null;
  isDownloadError: boolean;
};

export type UsePaymentMethodsReturn = {
  methods: PaymentMethodView[];
  isLoading: boolean;
  isError: boolean;
  startSetup: () => void;
  isSetupPending: boolean;
  remove: (id: string) => void;
  // Per-row, not per-page: a single isMutating flag would disable every row
  // while one is being deleted.
  pendingId: string | null;
  error: string | null;
  clearError: () => void;
  gatewaySession: GatewayCheckoutSession | null;
  closeGateway: () => void;
  completeGateway: () => Promise<void>;
};

export type UseCancelSubscriptionReturn = {
  cancel: () => void;
  resume: () => void;
  endNow: () => void;
  isCancelPending: boolean;
  isResumePending: boolean;
  isEndNowPending: boolean;
  error: string | null;
  clearError: () => void;
};

export type UseBillingViewStateReturn = {
  interval: BillingInterval;
  setInterval: (interval: BillingInterval) => void;
  gateway: BillingGateway;
  setGateway: (gateway: BillingGateway) => void;
  // The plan the user is considering. Non-null opens the quote dialog.
  targetPlan: BillingPlan | null;
  openPlanChange: (plan: BillingPlan) => void;
  closePlanChange: () => void;
  isCancelOpen: boolean;
  setIsCancelOpen: (open: boolean) => void;
  isEndNowOpen: boolean;
  setIsEndNowOpen: (open: boolean) => void;
};

export type UseBillingPageReturn = {
  subscription: UseCurrentSubscriptionReturn;
  usage: UseBillingUsageReturn;
  invoices: UseBillingInvoicesReturn;
  gateways: UseBillingGatewaysReturn;
  paymentMethods: UsePaymentMethodsReturn;
  planChange: UsePlanChangeReturn;
  plans: UseBillingPlansReturn;
  checkout: UseStartCheckoutReturn;
  cancellation: UseCancelSubscriptionReturn;
  view: UseBillingViewStateReturn;
  // Chosen by the page controller: a user with no subscription starts a fresh
  // checkout, an existing subscriber goes through quote -> confirm.
  selectPlan: (plan: BillingPlan) => void;
  confirmPlanSelection: () => void;
  t: TranslateFunction;
};

export type UsePaypalReturnReturn = {
  phase: BillingReturnPhase;
};
