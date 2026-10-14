import { z } from 'zod';

export const reservationSchema = z.union([
  z.object({ allowed: z.literal(true), reservationId: z.string().nullable() }),
  z.object({
    allowed: z.literal(false),
    reason: z.string(),
    used: z.number(),
    limit: z.number(),
    window: z.string().nullable(),
  }),
]);
