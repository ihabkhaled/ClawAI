import { type BillingGateway } from '@claw/shared-types';

// The normalized description of an inbound webhook, produced BEFORE any
// business decision is taken. Only these fields are ever persisted: the raw
// body is hashed, never stored, because it can carry payer details.
export type NormalizedWebhook = {
  gateway: BillingGateway;
  providerEventId: string;
  eventType: string;
  payloadHash: string;
  signatureValid: boolean;
};

// What a handler did. `IGNORED` is a first-class, successful outcome — an event
// type we do not act on is not a failure.
export type WebhookHandlingResult = {
  outcome: WebhookOutcome;
  subscriptionId: string | null;
  transactionId: string | null;
  failureCode: string | null;
};

// A checkout session that actually reached a gateway. `providerOrderId` is
// non-null by construction, which is what lets the handler read the order back
// instead of trusting the webhook body.
export type PayableSession = {
  id: string;
  providerOrderId: string;
  chargeAmountMinor: number;
  chargeCurrency: string;
};

export enum WebhookOutcome {
  PROCESSED = 'PROCESSED',
  DUPLICATE = 'DUPLICATE',
  IGNORED = 'IGNORED',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  FAILED = 'FAILED',
}
