import { z } from 'zod';

export const triggerScheduledCommandSchema = z.object({
  idempotencyKey: z
    .string()
    .min(8)
    .max(128)
    .regex(/^[\w.:-]+$/, 'idempotencyKey may contain letters, digits, _ . : - only'),
});

export type TriggerScheduledCommandDto = z.infer<typeof triggerScheduledCommandSchema>;
