import { z } from 'zod';

export const pauseConnectorSchema = z
  .object({
    reason: z.string().min(1).max(200).optional(),
  })
  .strict();

export type PauseConnectorDto = z.infer<typeof pauseConnectorSchema>;
