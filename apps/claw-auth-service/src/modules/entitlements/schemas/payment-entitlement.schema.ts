import { z } from 'zod';
import { SubscriptionStatus } from '@claw/shared-types';

import {
  PAYMENT_ENTITLEMENT_DATE_LENGTH,
  PAYMENT_ENTITLEMENT_MAX_ID_LENGTH,
  PAYMENT_ENTITLEMENT_MAX_REASON_LENGTH,
} from '../constants/payment-entitlement.constants';

const boundedIdSchema = z.string().min(1).max(PAYMENT_ENTITLEMENT_MAX_ID_LENGTH);
const timestampSchema = z.string().max(PAYMENT_ENTITLEMENT_DATE_LENGTH).datetime();
const authoritativeEntitlementBaseSchema = z.object({
  userId: boundedIdSchema,
  subscriptionId: boundedIdSchema.nullable(),
  planSlug: z.string().min(1).max(64),
  effectiveAt: timestampSchema,
  entitlementValidUntil: timestampSchema,
});

export const authoritativeBillingEntitlementSchema = z.discriminatedUnion('hasPaidEntitlement', [
  authoritativeEntitlementBaseSchema
    .extend({
      hasPaidEntitlement: z.literal(true),
      planId: boundedIdSchema,
      planPriceVersionId: boundedIdSchema,
      subscriptionStatus: z.enum(SubscriptionStatus),
    })
    .strict(),
  authoritativeEntitlementBaseSchema
    .extend({
      hasPaidEntitlement: z.literal(false),
      planId: z.null(),
      planPriceVersionId: z.null(),
      subscriptionStatus: z.enum(SubscriptionStatus).nullable(),
    })
    .strict(),
]);

export const billingEntitlementReconcileRequestSchema = z
  .object({
    eventId: boundedIdSchema,
    schemaVersion: z.number().int().positive(),
    producer: z.string().min(1).max(100),
    causationId: boundedIdSchema.nullable(),
    correlationId: boundedIdSchema,
    occurredAt: timestampSchema,
    userId: boundedIdSchema,
    subscriptionId: boundedIdSchema.nullable(),
    reasonCode: z.string().min(1).max(PAYMENT_ENTITLEMENT_MAX_REASON_LENGTH),
  })
  .strict();

export type BillingEntitlementReconcileRequest = z.infer<
  typeof billingEntitlementReconcileRequestSchema
>;
