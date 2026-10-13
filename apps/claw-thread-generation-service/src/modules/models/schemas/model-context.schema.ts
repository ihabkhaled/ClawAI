import { z } from 'zod';

export const contextWindowSchema = z.object({
  contextWindowTokens: z.number().int().positive().nullable(),
});
