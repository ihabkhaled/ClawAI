import { type BillingGateway } from '@claw/shared-types';

// Confirming a plan change.
//
// The userId and email come from the verified JWT, never the request body, and
// the amount is absent entirely — it comes from the quote being consumed.
export type ConfirmPlanChangeInput = {
  userId: string;
  userEmail: string;
  quoteId: string;
  gateway: BillingGateway;
  idempotencyKey: string;
};
