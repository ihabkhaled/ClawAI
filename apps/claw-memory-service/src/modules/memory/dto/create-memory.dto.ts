import { z } from 'zod';
import {
  MemoryRetention,
  MemoryScope,
  MemorySensitivity,
  MemorySource,
  MemoryType,
} from '../../../generated/prisma';

export const createMemorySchema = z.object({
  type: z.nativeEnum(MemoryType),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(50000, 'Content must be at most 50000 characters'),
  sourceThreadId: z.string().max(255).optional(),
  sourceMessageId: z.string().max(255).optional(),
  // V2 additions
  scope: z.nativeEnum(MemoryScope).optional(),
  scopeRef: z.string().max(255).optional(),
  tags: z.array(z.string().min(1).max(64)).max(20).optional(),
  category: z.string().max(64).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.nativeEnum(MemorySource).optional(),
  sensitivity: z.nativeEnum(MemorySensitivity).optional(),
  retentionPolicy: z.nativeEnum(MemoryRetention).optional(),
  expiresAt: z.string().datetime().optional(),
  pinned: z.boolean().optional(),
  provenanceJson: z.record(z.string(), z.unknown()).optional(),
});

export type CreateMemoryDto = z.infer<typeof createMemorySchema>;
