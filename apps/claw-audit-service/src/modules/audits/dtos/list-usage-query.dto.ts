import { z } from "zod";

export const listUsageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  provider: z.string().optional(),
  model: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ListUsageQueryDto = z.infer<typeof listUsageQuerySchema>;
