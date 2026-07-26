// Return paths on the frontend. Built from FRONTEND_URL server-side — never
// from a client-supplied redirect parameter, which would turn a real payment
// into an attacker-controlled landing page.
export const CHECKOUT_RETURN_PATH = '/billing/return';
export const CHECKOUT_CANCEL_PATH = '/billing/cancelled';

// Shown to the customer on their gateway statement and receipt.
export const CHECKOUT_DESCRIPTION_PREFIX = 'ClawAI subscription';

// Bytes of entropy in the state nonce echoed by the return page. 32 bytes is
// far beyond guessing range for a value that lives at most 30 minutes.
export const CHECKOUT_STATE_NONCE_BYTES = 32;
