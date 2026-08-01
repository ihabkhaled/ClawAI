import { z } from 'zod';

export const internalFileContentQuerySchema = z
  .object({
    userId: z.string().min(1).max(200),
  })
  .strict();

export type InternalFileContentQueryDto = z.infer<typeof internalFileContentQuerySchema>;
