import { z } from 'zod';

export const userDeletedEventSchema = z.object({
  eventId: z.string().min(1).max(100),
  userId: z.string().min(1).max(128),
  deletedAt: z.string().datetime(),
});

export type UserDeletedEvent = z.infer<typeof userDeletedEventSchema>;
