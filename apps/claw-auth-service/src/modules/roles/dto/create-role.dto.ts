import { z } from 'zod';
import { Permission } from '@claw/shared-types';

export const createRoleSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Z0-9_]+$/, 'Slug must be uppercase letters, numbers and underscores'),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  isAssignable: z.boolean().default(true),
  permissions: z.array(z.nativeEnum(Permission)).max(100).default([]),
});

export type CreateRoleDto = z.infer<typeof createRoleSchema>;
