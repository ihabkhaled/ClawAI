import { z } from "zod";

export const listServerLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  level: z.string().max(10).optional(),
  serviceName: z.string().max(100).optional(),
  module: z.string().max(200).optional(),
  controller: z.string().max(200).optional(),
  action: z.string().max(200).optional(),
  requestId: z.string().max(200).optional(),
  traceId: z.string().max(200).optional(),
  userId: z.string().max(200).optional(),
  threadId: z.string().max(200).optional(),
  provider: z.string().max(200).optional(),
  search: z.string().max(500).optional(),
  startDate: z.string().max(50).optional(),
  endDate: z.string().max(50).optional(),
});

export type ListServerLogsQueryDto = z.infer<typeof listServerLogsQuerySchema>;
