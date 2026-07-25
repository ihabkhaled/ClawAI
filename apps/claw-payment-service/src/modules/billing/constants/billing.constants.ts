// Every billing event carries a schema version so a consumer can reject an
// envelope it does not understand rather than guessing at the shape.
export const BILLING_EVENT_SCHEMA_VERSION = 1;

// Identifies the producer on every entitlement event. Auth refuses a paid
// activation that did not come from the payment service, so this is a security
// boundary and not a label.
export const PAYMENT_PRODUCER = 'claw-payment-service';

// How long a checkout session stays payable. Short enough that an abandoned
// session cannot be completed days later against a price that has since moved.
export const CHECKOUT_SESSION_TTL_MS = 30 * 60 * 1000;
