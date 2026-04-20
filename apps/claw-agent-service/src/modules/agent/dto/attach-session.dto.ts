import { z } from 'zod';

export const attachSessionSchema = z.object({
  hostname: z.string().min(1).max(253),
  platform: z.string().min(1).max(64),
  agentVersion: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[\w.\-+]+$/, 'agentVersion must be alphanumeric-dotted'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AttachSessionDto = z.infer<typeof attachSessionSchema>;
