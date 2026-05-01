import { z } from 'zod';

export const initiateHandoffSchema = z
  .object({
    mode: z.enum(['CHAT', 'AGENT', 'CLIPBOARD']),
  })
  .strict();

export type InitiateHandoffDto = z.infer<typeof initiateHandoffSchema>;
