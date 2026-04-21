import { z } from 'zod';

export const createScheduledCommandSchema = z.object({
  deviceId: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  command: z.string().min(1).max(4096),
  workingDir: z.string().min(1).max(1024).optional(),
  intervalMinutes: z.coerce
    .number()
    .int()
    .min(1)
    .max(60 * 24 * 7),
});

export type CreateScheduledCommandDto = z.infer<typeof createScheduledCommandSchema>;
