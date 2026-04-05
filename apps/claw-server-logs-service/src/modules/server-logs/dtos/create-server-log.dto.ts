import { z } from "zod";

export const createServerLogSchema = z.object({
  level: z.string().min(1).max(10),
  message: z.string().min(1).max(5000),
  serviceName: z.string().min(1).max(100),
  module: z.string().max(200).optional(),
  controller: z.string().max(200).optional(),
  service: z.string().max(200).optional(),
  manager: z.string().max(200).optional(),
  repository: z.string().max(200).optional(),
  action: z.string().max(200).optional(),
  route: z.string().max(500).optional(),
  method: z.string().max(10).optional(),
  statusCode: z.number().int().min(100).max(599).optional(),
  requestId: z.string().max(200).optional(),
  traceId: z.string().max(200).optional(),
  userId: z.string().max(200).optional(),
  threadId: z.string().max(200).optional(),
  messageId: z.string().max(200).optional(),
  connectorId: z.string().max(200).optional(),
  provider: z.string().max(200).optional(),
  model: z.string().max(200).optional(),
  latencyMs: z.number().min(0).optional(),
  errorCode: z.string().max(200).optional(),
  errorMessage: z.string().max(5000).optional(),
  errorStack: z.string().max(10_000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateServerLogDto = z.infer<typeof createServerLogSchema>;
