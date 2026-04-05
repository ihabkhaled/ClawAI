import { z } from "zod";

export const createClientLogSchema = z.object({
  level: z.string().min(1).max(10),
  message: z.string().min(1).max(5000),
  component: z.string().max(200).optional(),
  action: z.string().max(200).optional(),
  route: z.string().max(500).optional(),
  userId: z.string().max(200).optional(),
  sessionId: z.string().max(200).optional(),
  threadId: z.string().max(200).optional(),
  connectorId: z.string().max(200).optional(),
  requestId: z.string().max(200).optional(),
  locale: z.string().max(20).optional(),
  appearance: z.string().max(50).optional(),
  userAgent: z.string().max(1000).optional(),
  errorCode: z.string().max(200).optional(),
  errorStack: z.string().max(10_000).optional(),
  metadata: z.record(z.string().max(100), z.unknown()).optional(),
});

export type CreateClientLogDto = z.infer<typeof createClientLogSchema>;
