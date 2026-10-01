import { z } from 'zod';

/** F099: turn a prompt routine's webhook trigger on or off. */
export const setRoutineWebhookSchema = z.object({
  enabled: z.boolean(),
});

export type SetRoutineWebhookDto = z.infer<typeof setRoutineWebhookSchema>;
