import { z } from 'zod';
import { MemoryRetention } from '../../../generated/prisma';

export const upsertMemoryPreferenceSchema = z.object({
  pausedAll: z.boolean().optional(),
  autoApproveThreshold: z.number().min(0).max(1).optional(),
  defaultRetention: z.nativeEnum(MemoryRetention).optional(),
  defaultExpiresInDays: z.number().int().min(1).max(3650).nullable().optional(),
  redactByDefault: z.boolean().optional(),
});

export type UpsertMemoryPreferenceDto = z.infer<typeof upsertMemoryPreferenceSchema>;
