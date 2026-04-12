import { z } from 'zod';

export const replayRoutingSchema = z.object({
  threadId: z.string().max(255).optional(),
  routingMode: z.string().max(50).optional(),
  startDate: z.string().max(50).optional(),
  endDate: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export type ReplayRoutingDto = z.infer<typeof replayRoutingSchema>;
