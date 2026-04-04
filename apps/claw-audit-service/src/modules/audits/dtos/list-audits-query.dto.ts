import { z } from "zod";

export const listAuditsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  action: z.string().optional(),
  severity: z.string().optional(),
  entityType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

export type ListAuditsQueryDto = z.infer<typeof listAuditsQuerySchema>;
