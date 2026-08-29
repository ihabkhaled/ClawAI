import type { CreditBucket } from '../enums/credit-bucket.enum';
import type { CreditLedgerKind } from '../enums/credit-ledger-kind.enum';
import type { PaygSurface } from '../enums/payg-surface.enum';

/**
 * A user's PAYG wallet as the API returns it.
 *
 * Every figure is integer micro-USD. Floating point is banned in every billing
 * path in this platform and a wallet is the most literal example of why.
 *
 * `availableMicroUsd` is deliberately NET of outstanding holds: it is the number
 * the reservation gate actually compares against, so showing the gross balance
 * would let the UI promise money the next request cannot spend.
 */
export type PaygWalletSnapshot = {
  grantMicroUsd: number;
  purchasedMicroUsd: number;
  reservedMicroUsd: number;
  /** `grant + purchased − reserved`, floored at 0. What the next request may spend. */
  availableMicroUsd: number;
  /** The plan allowance this period started with; the denominator of the usage bar. */
  periodGrantMicroUsd: number;
  /** UTC `YYYY-MM` or the billing-period key the grant is scoped to. */
  periodKey: string;
  /** When the GRANT bucket next resets. ISO-8601. */
  grantResetsAt: string;
  /** True while the account bypasses PAYG entirely (administrators). */
  adminBypass: boolean;
  /** False while the platform-wide kill switch is off; nothing is metered. */
  meteringEnabled: boolean;
};

/**
 * One line of the append-only credit ledger, as shown to the user.
 *
 * Deliberately omits `walletId` and any provider payload: this is rendered in
 * the account UI, and a ledger row is not a place to leak internal identifiers.
 */
export type PaygLedgerEntryView = {
  id: string;
  kind: CreditLedgerKind;
  /** Signed. Positive credits the wallet, negative debits it. */
  amountMicroUsd: number;
  grantDeltaMicroUsd: number;
  purchasedDeltaMicroUsd: number;
  /** Running balance after this row. Lets a user audit the arithmetic themselves. */
  balanceAfterMicroUsd: number;
  surface: PaygSurface | null;
  provider: string | null;
  model: string | null;
  occurredAt: string;
};

/**
 * A purchasable top-up package as the checkout UI sees it.
 *
 * `priceMinor` and `creditMicroUsd` are independent on purpose: the ratio
 * between them is the platform's margin on a top-up, and pinning it to 1:1 in
 * code would book negative gross margin the moment a gateway fee is paid. It
 * lives in the database so an operator can change it without a deploy.
 */
export type CreditPackageView = {
  id: string;
  slug: string;
  priceMinor: number;
  currency: string;
  creditMicroUsd: number;
  displayOrder: number;
  /** The immutable version the price came from. Carried into checkout. */
  versionId: string;
};

/**
 * What the reservation gate decided about one request.
 *
 * `metered: false` is the common case — a local model, a disabled kill switch,
 * or an administrator — and short-circuits before any wallet read.
 */
export type PaygReservationOutcome =
  | { metered: false; reason: 'NOT_PAYG' | 'METERING_DISABLED' | 'ADMIN_BYPASS' }
  | {
      metered: true;
      reservationId: string;
      /** The ceiling the provider must be called with. May be below what was asked for. */
      maxOutputTokens: number;
      /** True when the ceiling was reduced to fit the balance; the user must be told. */
      clamped: boolean;
      heldMicroUsd: number;
      availableAfterMicroUsd: number;
    };

/**
 * Why a PAYG request was refused. Carries the numbers the user needs to act —
 * never an internal cost ceiling, a margin, or a provider rate.
 */
export type PaygRejection = {
  reason:
    | 'PAYG_CREDIT_EXHAUSTED'
    | 'PAYG_PROMPT_TOO_EXPENSIVE'
    | 'PAYG_MODEL_UNPRICED'
    | 'PAYG_PRICING_UNAVAILABLE';
  availableMicroUsd: number;
  requiredMicroUsd: number | null;
};

/**
 * Threshold crossings the wallet emits so the product can warn before the wall.
 *
 * Expressed as a fraction of the period grant AND as an absolute floor, because
 * a percentage alone is the wrong shape: on a small plan 95%-consumed can
 * already be less than one request's hold, so the warning would fire after the
 * user was blocked rather than before.
 */
export type PaygWarningThreshold = {
  percentConsumed: number;
  minRemainingMicroUsd: number;
};

export type CreditBucketDelta = {
  bucket: CreditBucket;
  amountMicroUsd: number;
};
