import { z } from 'zod';
import { ModelCategory, RuntimeType } from '../../../generated/prisma';

export const createCatalogEntrySchema = z.object({
  name: z.string().trim().min(1).max(120),
  tag: z.string().trim().min(1).max(64),
  displayName: z.string().trim().min(1).max(120),
  category: z.nativeEnum(ModelCategory),
  description: z.string().max(1000).nullable().default(null),
  parameterCount: z.string().trim().max(16).nullable().default(null),
  runtime: z.nativeEnum(RuntimeType).default(RuntimeType.OLLAMA),
  ollamaName: z.string().trim().max(200).nullable().default(null),
  isRecommended: z.boolean().default(false),
  capabilities: z.array(z.string().max(48)).max(32).default([]),
  businessCategories: z.array(z.string().max(48)).max(20).default([]),
  hardwareProfiles: z.array(z.string().max(32)).max(10).default([]),
});
export type CreateCatalogEntryDto = z.infer<typeof createCatalogEntrySchema>;

export const updateCatalogEntrySchema = createCatalogEntrySchema.partial();
export type UpdateCatalogEntryDto = z.infer<typeof updateCatalogEntrySchema>;
