import { z } from 'zod';
import { ContextPackScope, ContextPackVisibility } from '../../../generated/prisma';

export const createContextPackSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  scope: z.nativeEnum(ContextPackScope).optional(),
  scopeRef: z.string().max(255).optional(),
  // Back-compat: callers using the v1 free-text "scope" land here.
  legacyScope: z.string().max(255).optional(),
  tags: z.array(z.string().min(1).max(64)).max(20).optional(),
  visibility: z.nativeEnum(ContextPackVisibility).optional(),
  color: z.string().max(32).optional(),
  icon: z.string().max(64).optional(),
  templateId: z.string().max(64).optional(),
  pinned: z.boolean().optional(),
});

export type CreateContextPackDto = z.infer<typeof createContextPackSchema>;
