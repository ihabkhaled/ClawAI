import { z } from 'zod';

// Envelope every billing event must satisfy before it is allowed to change
// entitlement. Deliberately strict about the fields that carry authority
// (producer, schemaVersion, effectiveAt) and permissive about the rest, so a
// new optional field from the producer does not break entitlement delivery.
export const billingEventSchema = z.object({
  eventId: z.string().min(1).max(200),
  schemaVersion: z.number().int().positive(),
  producer: z.string().min(1).max(100),
  userId: z.string().min(1).max(100),
  subscriptionId: z.string().min(1).max(100).optional(),
  planId: z.string().min(1).max(100).optional(),
  planPriceVersionId: z.string().min(1).max(100).optional(),
  // Ordering key. A late-arriving event with an older effectiveAt must not
  // overwrite newer entitlement state.
  effectiveAt: z.string().datetime(),
  entitlementValidUntil: z.string().datetime(),
  correlationId: z.string().max(200).optional(),
  causationId: z.string().max(200).optional(),
  // Refund events are entitlement-neutral until their cumulative total equals
  // the captured charge. Absent on older events, which conservatively retain
  // the historical full-refund behavior.
  isFullRefund: z.boolean().optional(),
});

export type BillingEventEnvelope = z.infer<typeof billingEventSchema>;
