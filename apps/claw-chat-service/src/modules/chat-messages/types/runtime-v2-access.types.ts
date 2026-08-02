import { z } from 'zod';

export const runtimeV2AdmissionAckSchema = z
  .object({
    requestId: z.string().min(8).max(160),
    planId: z.string().min(1).max(160).nullable(),
    estimatedTokens: z.number().int().positive().max(2_000_000),
    reservationId: z.string().uuid(),
    replayed: z.boolean(),
    adminBypass: z.boolean(),
  })
  .strict();

export type RuntimeV2AdmissionAck = z.infer<typeof runtimeV2AdmissionAckSchema>;
