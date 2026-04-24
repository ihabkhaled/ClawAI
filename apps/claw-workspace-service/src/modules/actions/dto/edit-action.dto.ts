import { z } from 'zod';

export const editActionSchema = z
  .object({
    payload: z.record(z.string(), z.unknown()),
    editReason: z.string().min(1).max(500).optional(),
  })
  .strict();

export type EditActionDto = z.infer<typeof editActionSchema>;
