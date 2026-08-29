import { z } from 'zod';

import {
  CREDIT_EVENT_ID_MAX_LENGTH,
  CREDIT_MICRO_USD_DIGITS_MAX,
  CREDIT_PACKAGE_ID_MAX_LENGTH,
  CREDIT_USER_ID_MAX_LENGTH,
} from '../constants/credit.constants';

/**
 * `creditMicroUsd` on the wire.
 *
 * A decimal STRING, parsed to BigInt, never a JSON number. Credit is integer
 * micro-USD; a large package exceeds what a double carries exactly, and a
 * silently-rounded balance is money invented or destroyed. The digit bound is
 * what stops a malformed producer from handing us an integer no column can hold.
 */
const microUsdStringSchema = z.string().regex(/^\d+$/u).max(CREDIT_MICRO_USD_DIGITS_MAX);

/**
 * The envelope both credit events must satisfy before a wallet moves.
 *
 * Strict about the fields that carry authority — `producer`, `schemaVersion`,
 * `eventId`, the amount — and silent about anything else the producer may add,
 * so a new optional field does not stop credit being delivered.
 */
const creditTopupEventBaseSchema = z.object({
  eventId: z.string().min(1).max(CREDIT_EVENT_ID_MAX_LENGTH),
  schemaVersion: z.number().int().positive(),
  producer: z.string().min(1).max(100),
  userId: z.string().min(1).max(CREDIT_USER_ID_MAX_LENGTH),
  creditMicroUsd: microUsdStringSchema,
  packageId: z.string().min(1).max(CREDIT_PACKAGE_ID_MAX_LENGTH),
  packageVersionId: z.string().min(1).max(CREDIT_PACKAGE_ID_MAX_LENGTH),
  occurredAt: z.string().datetime(),
  correlationId: z.string().max(200).optional(),
  causationId: z.string().max(200).nullable().optional(),
});

export const creditTopupSucceededSchema = creditTopupEventBaseSchema.extend({
  paymentTransactionId: z.string().min(1).max(CREDIT_PACKAGE_ID_MAX_LENGTH),
  amountMinor: z.number().int().nonnegative(),
  currency: z.string().length(3),
});

export const creditTopupReversedSchema = creditTopupEventBaseSchema.extend({
  sourcePaymentTransactionId: z.string().min(1).max(CREDIT_PACKAGE_ID_MAX_LENGTH),
  paymentTransactionId: z.string().min(1).max(CREDIT_PACKAGE_ID_MAX_LENGTH),
  amountMinor: z.number().int().nonnegative(),
  currency: z.string().length(3),
  isChargeback: z.boolean(),
});

export type CreditTopupSucceededEvent = z.infer<typeof creditTopupSucceededSchema>;
export type CreditTopupReversedEvent = z.infer<typeof creditTopupReversedSchema>;
