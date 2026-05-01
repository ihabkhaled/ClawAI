import { z } from 'zod';

export const recordActivitySchema = z.object({
  deviceId: z.string().cuid(),
  kind: z.string().min(1).max(60),
  summary: z.string().min(1).max(2000),
  occurredAt: z.coerce.date(),
  syncedToCloud: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type RecordActivityDto = z.infer<typeof recordActivitySchema>;

export const listActivitySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  kind: z.string().min(1).max(60).optional(),
});

export type ListActivityQueryDto = z.infer<typeof listActivitySchema>;
