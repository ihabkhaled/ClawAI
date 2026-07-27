import { z } from 'zod';

export const createRefundSchema = z
  .object({
    paymentTransactionId: z.string().min(1).max(64),
    amountMinor: z.number().int().positive().max(2_147_483_647),
    idempotencyKey: z.string().min(8).max(128),
    reason: z.string().trim().min(4).max(500),
  })
  .strict();

export type CreateRefundDto = z.infer<typeof createRefundSchema>;
