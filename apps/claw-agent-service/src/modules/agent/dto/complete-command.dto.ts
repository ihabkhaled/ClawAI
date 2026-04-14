import { z } from 'zod';

export const completeCommandSchema = z.object({
  stdout: z.string().max(65_536).optional(),
  stderr: z.string().max(65_536).optional(),
  exitCode: z.number().int(),
});

export type CompleteCommandDto = z.infer<typeof completeCommandSchema>;
