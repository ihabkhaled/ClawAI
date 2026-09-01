import {
  BillingGateway,
  BillingInterval,
  SubscriptionStatus,
  UsageTone,
} from '@/enums/billing.enum';

// The plan catalog only changes when an administrator publishes a new price
// version, so it is cached generously instead of refetched on every mount.
export const BILLING_PLANS_STALE_MS = 5 * 60 * 1000;

// Current subscription and usage move on their own (renewal, a webhook landing,
// tokens being spent), so they are refetched more eagerly.
export const BILLING_SUBSCRIPTION_STALE_MS = 30 * 1000;
export const BILLING_USAGE_STALE_MS = 15 * 1000;

// While a checkout is awaiting the gateway the browser polls for the verified
// result. The redirect is display-only — the server's verification is the only
// thing that may flip the UI to "paid".
export const CHECKOUT_POLL_INTERVAL_MS = 2_000;

// Hard ceiling on polling, so a stuck session cannot spin forever. Roughly five
// minutes, which comfortably exceeds a hosted-checkout round trip.
export const CHECKOUT_POLL_MAX_ATTEMPTS = 150;

// A Paymob popup closes as soon as its browser callback fires, while the signed
// webhook may still be in flight. Keep the parent checking for one minute so
// verified completion can refresh billing without trusting the browser callback.
export const CHECKOUT_CLOSED_POLL_MAX_ATTEMPTS = 30;

export const PAYPAL_STATE_PATTERN = /^[a-f0-9]{64}$/;

export const PAYMOB_PIXEL_URL = 'https://cdn.jsdelivr.net/npm/paymob-pixel@1.2.7/main.js';
export const PAYMOB_PIXEL_INTEGRITY =
  'sha384-7MtBbtvCaAPz+WSXmp7mCMKgBGrC7PKG0BK8HbCri6UQ1YZKEcxxNVPIjwCuiyZl';
export const PAYMOB_SCRIPT_ID = 'paymob-pixel-sdk';
export const PAYPAL_SDK_URL = 'https://www.paypal.com/sdk/js';
export const PAYPAL_SDK_SCRIPT_ID_PREFIX = 'paypal-sdk';
export const PAYPAL_SDK_NAMESPACE_PREFIX = 'clawPaypal';
export const PAYPAL_ORDER_ID_QUERY_KEY = 'token';
export const PAYPAL_COMPLETION_MESSAGE_TYPE = 'claw:billing:paypal-completed';
export const PAYMOB_COMPLETION_MESSAGE_TYPE = 'claw:billing:paymob-completed';

// Usage bar turns amber here and red at the ceiling, so a user sees a limit
// approaching rather than discovering it mid-request.
export const USAGE_WARNING_THRESHOLD = 0.8;

// Render order for the interval toggle and the gateway picker. Explicit arrays
// rather than Object.values(), so adding an enum member cannot silently reorder
// or expose something in the UI before its copy exists.
export const BILLING_INTERVAL_ORDER: BillingInterval[] = [
  BillingInterval.MONTHLY,
  BillingInterval.QUARTERLY,
  BillingInterval.SEMIANNUAL,
  BillingInterval.YEARLY,
];

/** Lowercase URL query values PlanTierCard's checkout link uses, and
 * readCheckoutInterval parses back. Keep both in sync. */
export const CHECKOUT_URL_INTERVAL_PARAM: Record<BillingInterval, string> = {
  [BillingInterval.MONTHLY]: 'monthly',
  [BillingInterval.QUARTERLY]: 'quarterly',
  [BillingInterval.SEMIANNUAL]: 'semiannual',
  [BillingInterval.YEARLY]: 'yearly',
};

export const BILLING_GATEWAY_ORDER: BillingGateway[] = [
  BillingGateway.PAYPAL,
  BillingGateway.PAYMOB,
];

export const SUPPORTED_PLAN_CURRENCIES: string[] = ['USD', 'EUR', 'EGP'];

// Statuses that mean the account is in trouble and the user must act. Anything
// not listed renders no banner at all.
export const BILLING_ATTENTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.SUSPENDED,
  SubscriptionStatus.INCOMPLETE,
];

// Tailwind classes per usage tone. Semantic tokens only — no raw colour
// classes — so both themes and the amber warning stay readable.
export const USAGE_TONE_BAR_CLASSES: Record<UsageTone, string> = {
  [UsageTone.UNLIMITED]: 'bg-muted-foreground/40',
  [UsageTone.NORMAL]: 'bg-primary',
  [UsageTone.WARNING]: 'bg-warning',
  [UsageTone.EXHAUSTED]: 'bg-destructive',
};
