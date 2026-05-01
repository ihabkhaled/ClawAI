import { z } from 'zod';

export const UpdateBinarySchema = z.object({
  force: z.boolean().optional().default(false),
});

export type UpdateBinaryDto = z.infer<typeof UpdateBinarySchema>;
