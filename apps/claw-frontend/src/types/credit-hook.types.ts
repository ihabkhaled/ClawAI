import type {
  CreditPackageView,
  PaygLedgerEntryView,
  PaygWalletSnapshot,
} from '@claw/shared-types';

import type { BillingGateway } from '@/enums/billing.enum';
import type { CheckoutGatewayView, GatewayCheckoutSession } from '@/types/billing.types';
import type {
  AdjustCreditRequest,
  CreateCreditPackageRequest,
  CreditAdjustmentFormErrors,
  CreditAdjustmentFormState,
  CreditPackageFormErrors,
  CreditPackageFormState,
  CreditTopupStartInput,
  PublishCreditPackageVersionRequest,
} from '@/types/credit.types';
import type { TranslateFunction } from '@/types/i18n.types';

export type UseCreditWalletReturn = {
  wallet: PaygWalletSnapshot | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

export type UseCreditLedgerReturn = {
  entries: PaygLedgerEntryView[];
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  isFetchingMore: boolean;
  loadMore: () => void;
};

export type UseCreditPackagesReturn = {
  packages: CreditPackageView[];
  isLoading: boolean;
  isError: boolean;
};

export type UseCreditTopupReturn = {
  startTopup: (input: CreditTopupStartInput) => void;
  isPending: boolean;
  /** Surfaced as a dismissable banner as well as a toast. */
  error: string | null;
  clearError: () => void;
  /** Fed straight into the existing GatewayCheckoutDialog. */
  gatewaySession: GatewayCheckoutSession | null;
  closeGateway: () => void;
  completeGateway: () => Promise<void>;
};

export type UseCreditTopupDialogReturn = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  selectedPackageId: string | null;
  selectPackage: (packageId: string | null) => void;
  gateway: BillingGateway;
  setGateway: (gateway: BillingGateway) => void;
};

/**
 * The one controller hook every credit surface calls.
 *
 * Composes the focused hooks and owns the dialog's open/close state plus the
 * chosen package and gateway. A page that renders credit calls this once and
 * passes the result down as props.
 */
export type UseCreditPageReturn = {
  wallet: UseCreditWalletReturn;
  ledger: UseCreditLedgerReturn;
  packages: UseCreditPackagesReturn;
  topup: UseCreditTopupReturn;
  dialog: UseCreditTopupDialogReturn;
  gateways: CheckoutGatewayView[];
  confirmTopup: () => void;
  t: TranslateFunction;
  locale: string;
};

/** The composer badge. Renders nothing at all when the account is not metered. */
export type UseCreditIndicatorReturn = {
  wallet: PaygWalletSnapshot | null;
  isLoading: boolean;
  t: TranslateFunction;
  locale: string;
};

export type UseCreditClampedNoticeReturn = {
  isVisible: boolean;
  dismiss: () => void;
};

export type UseAdminCreditPackagesReturn = {
  packages: CreditPackageView[];
  isLoading: boolean;
  isError: boolean;
  createPackage: (payload: CreateCreditPackageRequest) => void;
  publishVersion: (packageId: string, payload: PublishCreditPackageVersionRequest) => void;
  isCreatePending: boolean;
  /** Per-row pending id, never a page-wide flag — one publish must not disable every row. */
  pendingPackageId: string | null;
  error: string | null;
  clearError: () => void;
};

export type UseAdminCreditWalletReturn = {
  wallet: PaygWalletSnapshot | null;
  isLoading: boolean;
  isError: boolean;
  /** The id actually looked up, which is not the id being typed. */
  lookedUpUserId: string | null;
  lookup: (userId: string) => void;
  adjust: (userId: string, payload: AdjustCreditRequest) => void;
  isAdjustPending: boolean;
  error: string | null;
  clearError: () => void;
};

export type UseAdminCreditPageReturn = {
  packages: UseAdminCreditPackagesReturn;
  walletLookup: UseAdminCreditWalletReturn;
  packageForm: UseCreditPackageFormReturn;
  adjustmentForm: UseCreditAdjustmentFormReturn;
  submitCreatePackage: () => void;
  submitPublishVersion: (packageId: string) => void;
  submitAdjustment: () => void;
  t: TranslateFunction;
  locale: string;
};

export type UseCreditPackageFormReturn = {
  state: CreditPackageFormState;
  setField: <K extends keyof CreditPackageFormState>(
    field: K,
    value: CreditPackageFormState[K],
  ) => void;
  fieldErrors: CreditPackageFormErrors;
  buildCreateRequest: () => CreateCreditPackageRequest | null;
  buildVersionRequest: () => PublishCreditPackageVersionRequest | null;
  reset: () => void;
};

export type UseCreditAdjustmentFormReturn = {
  state: CreditAdjustmentFormState;
  setField: <K extends keyof CreditAdjustmentFormState>(
    field: K,
    value: CreditAdjustmentFormState[K],
  ) => void;
  fieldErrors: CreditAdjustmentFormErrors;
  buildRequest: () => AdjustCreditRequest | null;
  reset: () => void;
};
