// Return paths on the frontend. Built from FRONTEND_URL server-side — never
// from a client-supplied redirect parameter, which would turn a real payment
// into an attacker-controlled landing page.
export const CHECKOUT_RETURN_PATH = '/billing/return';
export const CHECKOUT_CANCEL_PATH = '/billing/cancelled';

// Shown to the customer on their gateway statement and receipt.
export const CHECKOUT_DESCRIPTION_PREFIX = 'ClawAI subscription';

// A top-up must be recognisable on a bank statement as something OTHER than a
// subscription: a charge a customer cannot place is a chargeback waiting to
// happen, and a top-up looks exactly like a duplicate subscription charge if it
// is described as one.
export const CREDIT_TOPUP_DESCRIPTION_PREFIX = 'ClawAI credit';

// Return paths for a top-up. Separate from the subscription pair so the
// landing page can show a wallet balance rather than a plan.
export const CREDIT_TOPUP_RETURN_PATH = '/billing/credit/return';
export const CREDIT_TOPUP_CANCEL_PATH = '/billing/credit/cancelled';

// Bytes of entropy in the state nonce echoed by the return page. 32 bytes is
// far beyond guessing range for a value that lives at most 30 minutes.
export const CHECKOUT_STATE_NONCE_BYTES = 32;

// Internal claim state: the owning replica may attempt capture exactly once.
// A crash here is resolved by reading the provider order, never by recapturing.
export const CHECKOUT_CAPTURING_STATUS = 'CAPTURING';
