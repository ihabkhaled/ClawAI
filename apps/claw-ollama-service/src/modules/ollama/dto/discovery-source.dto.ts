import { z } from 'zod';
import { DiscoverySourceType } from '../../../generated/prisma';

export const createDiscoverySourceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.nativeEnum(DiscoverySourceType),
  baseUrl: z.string().trim().url().max(500),
  isEnabled: z.boolean().default(true),
  categories: z.array(z.string().max(64)).max(32).default([]),
  maxResults: z.number().int().min(1).max(500).default(50),
  minQuality: z.number().int().min(0).max(100).default(0),
});
export type CreateDiscoverySourceDto = z.infer<typeof createDiscoverySourceSchema>;

export const updateDiscoverySourceSchema = createDiscoverySourceSchema.partial();
export type UpdateDiscoverySourceDto = z.infer<typeof updateDiscoverySourceSchema>;
