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

// Usage bar turns amber here and red at the ceiling, so a user sees a limit
// approaching rather than discovering it mid-request.
export const USAGE_WARNING_THRESHOLD = 0.8;
