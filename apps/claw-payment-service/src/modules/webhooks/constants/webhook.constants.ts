// PayPal event types this service acts on. Anything else is recorded and
// IGNORED rather than guessed at — a webhook we do not understand must never
// take a financial action by default.
export const PAYPAL_HANDLED_EVENTS = {
  CAPTURE_COMPLETED: 'PAYMENT.CAPTURE.COMPLETED',
  CAPTURE_DENIED: 'PAYMENT.CAPTURE.DENIED',
  CAPTURE_REFUNDED: 'PAYMENT.CAPTURE.REFUNDED',
  CAPTURE_REVERSED: 'PAYMENT.CAPTURE.REVERSED',
} as const;

// Paymob posts a single transaction callback rather than typed events, so the
// type is synthesised for the audit row.
export const PAYMOB_TRANSACTION_EVENT = 'TRANSACTION';

// Cap on the stored event type string, so a hostile payload cannot write an
// unbounded value into the audit row.
export const WEBHOOK_EVENT_TYPE_MAX_LENGTH = 128;
export const WEBHOOK_EVENT_ID_MAX_LENGTH = 128;

// Returned to every webhook caller, valid or not. A gateway that receives a
// 4xx retries; telling a forger their signature failed just tells them to try
// a different one. Acknowledge, record, and act only on what verified.
export const WEBHOOK_ACK_BODY = { received: true } as const;
