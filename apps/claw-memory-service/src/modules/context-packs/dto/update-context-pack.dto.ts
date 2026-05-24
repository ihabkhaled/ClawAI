import { z } from 'zod';
import { ContextPackScope, ContextPackVisibility } from '../../../generated/prisma';

export const updateContextPackSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  scope: z.nativeEnum(ContextPackScope).optional(),
  scopeRef: z.string().max(255).nullable().optional(),
  tags: z.array(z.string().min(1).max(64)).max(20).optional(),
  visibility: z.nativeEnum(ContextPackVisibility).optional(),
  isEnabled: z.boolean().optional(),
  pausedUntil: z.string().datetime().nullable().optional(),
  pinned: z.boolean().optional(),
  color: z.string().max(32).nullable().optional(),
  icon: z.string().max(64).nullable().optional(),
});

export type UpdateContextPackDto = z.infer<typeof updateContextPackSchema>;
