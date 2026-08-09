import type { BillingGateway, BillingInterval } from '@/enums/billing.enum';
import type {
  BillingPlan,
  BillingUsage,
  CheckoutGatewayView,
  CurrentSubscription,
  FeatureAllowance,
  InvoiceView,
  GatewayCheckoutSession,
  PaymentMethodView,
  ProrationQuoteView,
  UsageWindow,
} from '@/types/billing.types';
import type { TranslateFunction } from '@/types/i18n.types';

export type BillingStatusBannerProps = {
  subscription: CurrentSubscription | null;
  t: TranslateFunction;
};

export type BillingErrorBannerProps = {
  message: string;
  onDismiss: () => void;
  t: TranslateFunction;
};

export type SubscriptionSummaryCardProps = {
  subscription: CurrentSubscription | null;
  onCancel: () => void;
  onResume: () => void;
  onEndNow: () => void;
  isCancelPending: boolean;
  isResumePending: boolean;
  isEndNowPending: boolean;
  t: TranslateFunction;
};

export type BillingIntervalToggleProps = {
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  t: TranslateFunction;
};

export type PlanComparisonGridProps = {
  plans: BillingPlan[];
  subscription: CurrentSubscription | null;
  interval: BillingInterval;
  onSelect: (plan: BillingPlan) => void;
  pendingPlanId: string | null;
  t: TranslateFunction;
};

export type BillingPlanCardProps = {
  plan: BillingPlan;
  interval: BillingInterval;
  isCurrent: boolean;
  onSelect: (plan: BillingPlan) => void;
  isPending: boolean;
  t: TranslateFunction;
};

export type UsageWindowBarProps = {
  label: string;
  window: UsageWindow;
  t: TranslateFunction;
};

export type UsageOverviewCardProps = {
  usage: BillingUsage | null;
  isLoading: boolean;
  isError: boolean;
  t: TranslateFunction;
};

export type FeatureAllowanceListProps = {
  features: FeatureAllowance[];
  t: TranslateFunction;
};

export type InvoiceTableProps = {
  invoices: InvoiceView[];
  isLoading: boolean;
  isError: boolean;
  onDownload: (id: string, number: string) => void;
  pendingId: string | null;
  isDownloadError: boolean;
  t: TranslateFunction;
};

export type PaymentMethodListProps = {
  methods: PaymentMethodView[];
  isLoading: boolean;
  isError: boolean;
  onAdd: () => void;
  isAdding: boolean;
  onRemove: (id: string) => void;
  // Per-row, so removing one card does not disable every other row.
  pendingId: string | null;
  t: TranslateFunction;
};

export type GatewaySelectProps = {
  value: BillingGateway;
  onChange: (gateway: BillingGateway) => void;
  disabled: boolean;
  gateways: CheckoutGatewayView[];
  t: TranslateFunction;
};

export type PlanChangeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlan: BillingPlan | null;
  quote: ProrationQuoteView | null;
  gateway: BillingGateway;
  gateways: CheckoutGatewayView[];
  onGatewayChange: (gateway: BillingGateway) => void;
  onConfirm: () => void;
  isQuoting: boolean;
  isConfirming: boolean;
  t: TranslateFunction;
};

export type ProrationBreakdownProps = {
  quote: ProrationQuoteView;
  t: TranslateFunction;
};

export type GatewayCheckoutDialogProps = {
  session: GatewayCheckoutSession | null;
  gateways: CheckoutGatewayView[];
  onClose: () => void;
  onComplete: () => Promise<void>;
  t: TranslateFunction;
};
