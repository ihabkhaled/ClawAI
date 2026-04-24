import { z } from 'zod';

export const bulkApproveSchema = z
  .object({
    actionIds: z.array(z.string().min(1).max(64)).min(1).max(100),
  })
  .strict();

export type BulkApproveDto = z.infer<typeof bulkApproveSchema>;
