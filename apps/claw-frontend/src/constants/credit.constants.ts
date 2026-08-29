import { CreditLedgerKind, PaygSurface } from '@claw/shared-types';

import { BillingGateway } from '@/enums/billing.enum';
import type { CreditAdjustmentFormState, CreditPackageFormState } from '@/types/credit.types';

/**
 * THE disclaimer key. One key, six surfaces.
 *
 * `/pricing`, `/plan`, `/billing`, the model selector, the top-up dialog and the
 * 402 body all render THIS constant through `CreditDualConsumptionNotice`. It is
 * a constant rather than six inline strings for one reason: the moment a second
 * key exists, an operator edits one of them and the platform starts making two
 * different promises about what a cloud answer costs, in thirteen languages.
 */
export const PAYG_DUAL_CONSUMPTION_NOTICE_KEY = 'billing.credit.dualConsumptionNotice';

/**
 * The wallet moves while the user watches — every metered message spends some —
 * so it is refetched eagerly and on window focus, like the token usage beside it.
 */
export const CREDIT_WALLET_STALE_MS = 15 * 1000;

/** The package catalog only changes when an operator publishes a new version. */
export const CREDIT_PACKAGES_STALE_MS = 5 * 60 * 1000;

/** The ledger is append-only; a page already fetched never changes underneath. */
export const CREDIT_LEDGER_STALE_MS = 30 * 1000;

/**
 * Currency the wallet itself is denominated in.
 *
 * Credit is a dollar allowance, not a purse: a top-up may be CHARGED in EGP and
 * still buys micro-USD of credit, because provider rates are quoted in USD and
 * converting the balance would make the spend arithmetic FX-dependent.
 */
export const CREDIT_WALLET_CURRENCY = 'USD';

/**
 * How many fraction digits a credit amount renders with.
 *
 * Two is right for a balance and wrong for a ledger row: a single cheap message
 * costs a fraction of a cent, and rounding it to $0.00 makes the running balance
 * look like it moves for no reason — which is precisely the "where did my $5 go"
 * question this UI exists to answer.
 */
export const CREDIT_BALANCE_FRACTION_DIGITS = 2;
export const CREDIT_LEDGER_FRACTION_DIGITS = 4;

/**
 * Below this, a balance renders with ledger precision instead of two decimals.
 * $0.0043 left is a very different message from $0.00 left.
 */
export const CREDIT_PRECISE_DISPLAY_THRESHOLD_MICRO_USD = 10_000;

/**
 * Providers the composer badges as metered, for information only.
 *
 * This list NEVER disables anything. `model-selector.tsx` carries a written
 * invariant that model selection stays open to every plan tier, and the server
 * is the only gate — a per-connector admin override can flip a provider's PAYG
 * status at runtime, so a browser copy of the rule would be wrong within
 * minutes. The badge is a hint about cost, not a permission check.
 */
export const PAYG_BADGE_PROVIDERS: readonly string[] = [
  'OPENAI',
  'ANTHROPIC',
  'GEMINI',
  'DEEPSEEK',
  'GROK',
  'AWS_BEDROCK',
];

/** Query parameter that opens the top-up dialog straight from a 402 CTA. */
export const CREDIT_TOPUP_QUERY_KEY = 'topup';
export const CREDIT_TOPUP_QUERY_VALUE = 'open';

/** Default gateway pre-selected in the top-up dialog before the list loads. */
export const CREDIT_TOPUP_DEFAULT_GATEWAY: BillingGateway = BillingGateway.PAYPAL;

/**
 * Which product spent the money, in the user's words.
 *
 * One entry per `PaygSurface` member. A surface with no label would render its
 * raw enum name into a billing table, which is how a spend question becomes a
 * support ticket.
 */
export const PAYG_SURFACE_LABEL_KEYS: Record<PaygSurface, string> = {
  [PaygSurface.CHAT]: 'billing.credit.surface.CHAT',
  [PaygSurface.COMPARE]: 'billing.credit.surface.COMPARE',
  [PaygSurface.JUDGE]: 'billing.credit.surface.JUDGE',
  [PaygSurface.ORCHESTRATION]: 'billing.credit.surface.ORCHESTRATION',
  [PaygSurface.IMAGE]: 'billing.credit.surface.IMAGE',
  [PaygSurface.FILE_GENERATION]: 'billing.credit.surface.FILE_GENERATION',
  [PaygSurface.CODING_AGENT]: 'billing.credit.surface.CODING_AGENT',
  [PaygSurface.WORKSPACE_ACTION]: 'billing.credit.surface.WORKSPACE_ACTION',
  [PaygSurface.ROUTING]: 'billing.credit.surface.ROUTING',
};

/** Why a ledger row exists, in the user's words. One entry per CreditLedgerKind. */
export const CREDIT_LEDGER_KIND_LABEL_KEYS: Record<CreditLedgerKind, string> = {
  [CreditLedgerKind.PLAN_GRANT]: 'billing.credit.kind.PLAN_GRANT',
  [CreditLedgerKind.GRANT_EXPIRY]: 'billing.credit.kind.GRANT_EXPIRY',
  [CreditLedgerKind.TOPUP]: 'billing.credit.kind.TOPUP',
  [CreditLedgerKind.TOPUP_REVERSAL]: 'billing.credit.kind.TOPUP_REVERSAL',
  [CreditLedgerKind.RESERVATION]: 'billing.credit.kind.RESERVATION',
  [CreditLedgerKind.RESERVATION_RELEASE]: 'billing.credit.kind.RESERVATION_RELEASE',
  [CreditLedgerKind.CONSUMPTION]: 'billing.credit.kind.CONSUMPTION',
  [CreditLedgerKind.ADMIN_ADJUSTMENT]: 'billing.credit.kind.ADMIN_ADJUSTMENT',
  [CreditLedgerKind.PROVIDER_FAILURE_REFUND]: 'billing.credit.kind.PROVIDER_FAILURE_REFUND',
};

/**
 * Ledger rows the account UI hides.
 *
 * A hold and its release cancel out and never changed what the user actually
 * spent; showing both would double the length of the table and make the running
 * balance appear to bounce. `CONSUMPTION` is the settled truth.
 */
export const CREDIT_LEDGER_HIDDEN_KINDS: readonly CreditLedgerKind[] = [
  CreditLedgerKind.RESERVATION,
  CreditLedgerKind.RESERVATION_RELEASE,
];

/**
 * Package slug shape. Character classes only, no nested quantifiers, per the
 * ReDoS lint rule that governs every pattern in this codebase.
 */
export const CREDIT_PACKAGE_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** Blank package form. Numeric fields are strings; the schema coerces on submit. */
export const CREDIT_PACKAGE_FORM_DEFAULTS: CreditPackageFormState = {
  slug: '',
  displayOrder: '0',
  priceMajor: '',
  currency: CREDIT_WALLET_CURRENCY,
  creditMajor: '',
};

export const CREDIT_ADJUSTMENT_FORM_DEFAULTS: CreditAdjustmentFormState = {
  userId: '',
  amountMajor: '',
  reason: '',
};
