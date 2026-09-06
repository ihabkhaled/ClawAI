import { z } from 'zod';
import { BillingInterval, InvoiceStatus, SubscriptionStatus } from '@claw/shared-types';

import { ADMIN_USER_ID_MAX_LENGTH } from '../constants/admin-user-billing.constants';

// `status` and `billingInterval` are plain `String` columns in this service's
// schema, so this schema is the boundary that turns them into the enums the
// shared contract promises. Parsing rather than casting is deliberate: an
// unrecognised value fails here instead of reaching an admin screen typed as
// something it is not (rule 28.7).
const boundedIdSchema = z.string().min(1).max(ADMIN_USER_ID_MAX_LENGTH);
const slugSchema = z.string().min(1).max(64);
const timestampSchema = z.string().datetime();
const currencySchema = z.string().min(3).max(3);
// Integer minor units. `.int()` is the invariant that matters; the sign is not
// constrained, because a credit note is a legitimate negative document and an
// admin read must show it rather than fail closed on it.
const minorUnitsSchema = z.number().int();

const subscriptionSnapshotSchema = z
  .object({
    id: boundedIdSchema,
    planId: boundedIdSchema,
    planSlug: slugSchema,
    status: z.enum(SubscriptionStatus),
    billingInterval: z.enum(BillingInterval),
    currency: currencySchema,
    amountMinor: minorUnitsSchema,
    currentPeriodStart: timestampSchema,
    currentPeriodEnd: timestampSchema,
    cancelAtPeriodEnd: z.boolean(),
    cancelledAt: timestampSchema.nullable(),
    pastDueAt: timestampSchema.nullable(),
    gracePeriodEndsAt: timestampSchema.nullable(),
    entitlementValidUntil: timestampSchema,
    scheduledPlanSlug: slugSchema.nullable(),
    scheduledEffectiveAt: timestampSchema.nullable(),
    createdAt: timestampSchema,
  })
  .strict();

const subscriptionHistoryEntrySchema = z
  .object({
    id: boundedIdSchema,
    planSlug: slugSchema,
    status: z.enum(SubscriptionStatus),
    billingInterval: z.enum(BillingInterval),
    amountMinor: minorUnitsSchema,
    currency: currencySchema,
    createdAt: timestampSchema,
    currentPeriodStart: timestampSchema,
    currentPeriodEnd: timestampSchema,
    cancelledAt: timestampSchema.nullable(),
  })
  .strict();

const invoiceEntrySchema = z
  .object({
    id: boundedIdSchema,
    number: z.string().min(1).max(64),
    status: z.enum(InvoiceStatus),
    currency: currencySchema,
    totalMinor: minorUnitsSchema,
    amountPaidMinor: minorUnitsSchema,
    periodStart: timestampSchema.nullable(),
    periodEnd: timestampSchema.nullable(),
    issuedAt: timestampSchema,
    paidAt: timestampSchema.nullable(),
  })
  .strict();

const paidTotalSchema = z
  .object({
    currency: currencySchema,
    amountMinor: minorUnitsSchema,
  })
  .strict();

export const adminUserSubscriptionStatisticsSchema = z
  .object({
    userId: boundedIdSchema,
    generatedAt: timestampSchema,
    subscription: subscriptionSnapshotSchema.nullable(),
    periodLengthMonths: z.number().int().positive().nullable(),
    nextRenewalAt: timestampSchema.nullable(),
    monthsPaid: z.number().int().nonnegative(),
    totalPaidMinor: z.array(paidTotalSchema),
    subscriptionHistory: z.array(subscriptionHistoryEntrySchema),
    recentInvoices: z.array(invoiceEntrySchema),
  })
  .strict();
