import { z } from 'zod';
import { FeedbackStatus } from '@claw/shared-types';

export const updateFeedbackStatusSchema = z.object({
  status: z.nativeEnum(FeedbackStatus),
  note: z.string().max(1000).optional(),
});

export type UpdateFeedbackStatusDto = z.infer<typeof updateFeedbackStatusSchema>;
