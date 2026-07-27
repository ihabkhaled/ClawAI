import { z } from 'zod';
import {
  BillingGateway,
  BillingInterval,
  PaymentTransactionStatus,
  PaymentTransactionType,
  SubscriptionStatus,
} from '@claw/shared-types';

import {
  INTERNAL_PAYMENTS_DATE_LENGTH,
  INTERNAL_PAYMENTS_MAX_ID_LENGTH,
} from '../constants/internal-payments.constants';

const boundedIdSchema = z.string().min(1).max(INTERNAL_PAYMENTS_MAX_ID_LENGTH);
const timestampSchema = z.string().max(INTERNAL_PAYMENTS_DATE_LENGTH).datetime();
const currencySchema = z.string().min(3).max(3);

export const internalPaymentStatusResponseSchema = z
  .object({
    paymentTransactionId: boundedIdSchema,
    subscriptionId: boundedIdSchema.nullable(),
    userId: boundedIdSchema,
    gateway: z.enum(BillingGateway),
    type: z.enum(PaymentTransactionType),
    status: z.enum(PaymentTransactionStatus),
    amountMinor: z.number().int().nonnegative(),
    currency: currencySchema,
    capturedAt: timestampSchema.nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();

export const internalSubscriptionStatusResponseSchema = z
  .object({
    subscriptionId: boundedIdSchema,
    userId: boundedIdSchema,
    planId: boundedIdSchema,
    planSlug: z.string().min(1).max(64),
    planPriceVersionId: boundedIdSchema,
    gateway: z.enum(BillingGateway),
    status: z.enum(SubscriptionStatus),
    billingInterval: z.enum(BillingInterval),
    entitlementValidUntil: timestampSchema,
    gracePeriodEndsAt: timestampSchema.nullable(),
    updatedAt: timestampSchema,
  })
  .strict();

const authoritativeEntitlementBaseSchema = z.object({
  userId: boundedIdSchema,
  subscriptionId: boundedIdSchema.nullable(),
  planSlug: z.string().min(1).max(64),
  effectiveAt: timestampSchema,
  entitlementValidUntil: timestampSchema,
});

export const authoritativeBillingEntitlementResponseSchema = z.discriminatedUnion(
  'hasPaidEntitlement',
  [
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
  ],
);
