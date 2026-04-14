import { z } from 'zod';

export const listEventsQuerySchema = z.object({
  sessionId: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type ListEventsQueryDto = z.infer<typeof listEventsQuerySchema>;
