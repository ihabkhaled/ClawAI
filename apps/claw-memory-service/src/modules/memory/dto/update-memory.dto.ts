import { z } from 'zod';
import {
  MemoryRetention,
  MemoryScope,
  MemorySensitivity,
  MemoryType,
} from '../../../generated/prisma';
import { MEMORY_CONTENT_MAX_CHARS } from '../../../common/constants/content-limits.constants';

export const updateMemorySchema = z.object({
  // The edit dialog always sent `type`; the schema did not declare it, so Zod
  // stripped it and a type change silently never persisted.
  type: z.nativeEnum(MemoryType).optional(),
  content: z.string().min(1).max(MEMORY_CONTENT_MAX_CHARS).optional(),
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
