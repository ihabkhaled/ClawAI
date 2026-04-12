import { z } from "zod";

export const searchClientLogsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  level: z.string().max(10).optional(),
  component: z.string().max(200).optional(),
  action: z.string().max(200).optional(),
  route: z.string().max(500).optional(),
  userId: z.string().max(200).optional(),
  sessionId: z.string().max(200).optional(),
  threadId: z.string().max(200).optional(),
  connectorId: z.string().max(200).optional(),
  requestId: z.string().max(200).optional(),
  errorCode: z.string().max(200).optional(),
  search: z.string().max(500).optional(),
  messageContains: z.string().max(500).optional(),
  startDate: z.string().max(50).optional(),
  endDate: z.string().max(50).optional(),
  sortBy: z
    .enum(["createdAt", "level", "component"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type SearchClientLogsDto = z.infer<typeof searchClientLogsSchema>;
