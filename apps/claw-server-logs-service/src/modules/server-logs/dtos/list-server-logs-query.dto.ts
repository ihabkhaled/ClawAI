import { z } from 'zod';

export const listServerLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  level: z.string().max(10).optional(),
  serviceName: z.string().max(100).optional(),
  module: z.string().max(200).optional(),
  controller: z.string().max(200).optional(),
  service: z.string().max(200).optional(),
  manager: z.string().max(200).optional(),
  action: z.string().max(200).optional(),
  method: z.string().max(10).optional(),
  route: z.string().max(500).optional(),
  statusCode: z.coerce.number().int().min(100).max(599).optional(),
  statusCodeMin: z.coerce.number().int().min(100).max(599).optional(),
  statusCodeMax: z.coerce.number().int().min(100).max(599).optional(),
  requestId: z.string().max(200).optional(),
  traceId: z.string().max(200).optional(),
  userId: z.string().max(200).optional(),
  threadId: z.string().max(200).optional(),
  messageId: z.string().max(200).optional(),
  connectorId: z.string().max(200).optional(),
  provider: z.string().max(200).optional(),
  modelName: z.string().max(200).optional(),
  errorCode: z.string().max(200).optional(),
  latencyMin: z.coerce.number().min(0).optional(),
  latencyMax: z.coerce.number().min(0).optional(),
  search: z.string().max(500).optional(),
  messageContains: z.string().max(500).optional(),
  startDate: z.string().max(50).optional(),
  endDate: z.string().max(50).optional(),
  sortBy: z
    .enum(['createdAt', 'latencyMs', 'level', 'serviceName'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  interval: z.coerce.number().int().min(1).max(1440).optional(),
});

export type ListServerLogsQueryDto = z.infer<typeof listServerLogsQuerySchema>;
