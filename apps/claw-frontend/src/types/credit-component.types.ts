import type {
  CreditPackageView,
  PaygLedgerEntryView,
  PaygWalletSnapshot,
} from '@claw/shared-types';

import type { BillingGateway } from '@/enums/billing.enum';
import type { CheckoutGatewayView } from '@/types/billing.types';
import type {
  CreditAdjustmentFormErrors,
  CreditAdjustmentFormState,
  CreditPackageFormErrors,
  CreditPackageFormState,
} from '@/types/credit.types';
import type { TranslateFunction } from '@/types/i18n.types';

export type CreditBalanceCardProps = {
  wallet: PaygWalletSnapshot | null;
  isLoading: boolean;
  isError: boolean;
  /** Omit to render the card without a purchase affordance (e.g. read-only). */
  onAddCredit?: () => void;
  t: TranslateFunction;
  locale: string;
};

export type CreditPackagePickerProps = {
  packages: CreditPackageView[];
  selectedPackageId: string | null;
  onSelect: (packageId: string) => void;
  isLoading: boolean;
  isError: boolean;
  t: TranslateFunction;
  locale: string;
};

export type CreditTopupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages: CreditPackageView[];
  isPackagesLoading: boolean;
  isPackagesError: boolean;
  selectedPackageId: string | null;
  onSelectPackage: (packageId: string) => void;
  gateway: BillingGateway;
  gateways: CheckoutGatewayView[];
  onGatewayChange: (gateway: BillingGateway) => void;
  onConfirm: () => void;
  isConfirming: boolean;
  errorMessage: string | null;
  t: TranslateFunction;
  locale: string;
};

/**
 * AC-9: "where did my $5 go".
 *
 * Every column here exists because its absence turns a spend question into a
 * support ticket: the date says when, the surface says which product did it,
 * the model says what it bought, and the running balance lets the user check
 * the arithmetic themselves instead of taking our word for it.
 */
export type CreditLedgerTableProps = {
  entries: PaygLedgerEntryView[];
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
  t: TranslateFunction;
  locale: string;
};

/**
 * THE disclaimer. One component, one key, six surfaces.
 *
 * It takes no copy prop on purpose: a caller that could pass its own string is
 * exactly how thirteen locale files end up with thirteen slightly different
 * promises about what a cloud answer costs.
 */
export type CreditDualConsumptionNoticeProps = {
  t: TranslateFunction;
  className?: string;
};

export type CreditUsageSectionProps = {
  wallet: PaygWalletSnapshot;
  t: TranslateFunction;
  locale: string;
};

/**
 * The clamped-answer notice.
 *
 * Takes only `t`: the dismissal is per-render local state that belongs to this
 * showing of the message, not to the message row, so it is owned by the
 * component's own hook rather than threaded down from a page controller.
 */
export type CreditClampedNoticeProps = {
  t: TranslateFunction;
};

export type CreditPackageEditorProps = {
  packages: CreditPackageView[];
  isLoading: boolean;
  isError: boolean;
  state: CreditPackageFormState;
  fieldErrors: CreditPackageFormErrors;
  setField: <K extends keyof CreditPackageFormState>(
    field: K,
    value: CreditPackageFormState[K],
  ) => void;
  onCreate: () => void;
  onPublishVersion: (packageId: string) => void;
  isCreatePending: boolean;
  pendingPackageId: string | null;
  t: TranslateFunction;
  locale: string;
};

export type CreditAdjustmentFormProps = {
  state: CreditAdjustmentFormState;
  fieldErrors: CreditAdjustmentFormErrors;
  setField: <K extends keyof CreditAdjustmentFormState>(
    field: K,
    value: CreditAdjustmentFormState[K],
  ) => void;
  onSubmit: () => void;
  isPending: boolean;
  t: TranslateFunction;
};
