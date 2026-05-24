import { z } from 'zod';
import { MemoryRetention, MemoryScope, MemorySensitivity } from '../../../generated/prisma';

export const updateMemorySchema = z.object({
  content: z.string().min(1).max(50000).optional(),
  isEnabled: z.boolean().optional(),
  scope: z.nativeEnum(MemoryScope).optional(),
  scopeRef: z.string().max(255).nullable().optional(),
  tags: z.array(z.string().min(1).max(64)).max(20).optional(),
  category: z.string().max(64).nullable().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  retentionPolicy: z.nativeEnum(MemoryRetention).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  sensitivity: z.nativeEnum(MemorySensitivity).optional(),
  pinned: z.boolean().optional(),
  pausedUntil: z.string().datetime().nullable().optional(),
});

export type UpdateMemoryDto = z.infer<typeof updateMemorySchema>;
