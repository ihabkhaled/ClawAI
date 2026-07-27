import { z } from 'zod';

export const billingAuditEventSchema = z.object({
  eventId: z.string().min(1).max(200),
  schemaVersion: z.number().int().positive(),
  producer: z.literal('claw-payment-service'),
  causationId: z.string().min(1).max(200).nullable().optional(),
  correlationId: z.string().min(1).max(200).optional(),
  occurredAt: z.string().datetime().optional(),
  userId: z.string().min(1).max(100),
  subscriptionId: z.string().min(1).max(100).optional(),
  planId: z.string().min(1).max(100).optional(),
  planSlug: z.string().min(1).max(100).optional(),
  planPriceVersionId: z.string().min(1).max(100).optional(),
  grantType: z.string().min(1).max(50).optional(),
  effectiveAt: z.string().datetime().optional(),
  entitlementValidUntil: z.string().datetime().optional(),
  previousPlanId: z.string().min(1).max(100).optional(),
  previousPlanSlug: z.string().min(1).max(100).optional(),
  previousPlanPriceVersionId: z.string().min(1).max(100).optional(),
  paymentTransactionId: z.string().min(1).max(100).optional(),
  refundedAmountMinor: z.number().int().positive().optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  isFullRefund: z.boolean().optional(),
});
