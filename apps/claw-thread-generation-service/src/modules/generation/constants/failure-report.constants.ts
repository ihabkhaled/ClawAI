import { z } from 'zod';

export const requestRolesSchema = z.object({
  authors: z.array(z.unknown()).default([]),
  judge: z.unknown().optional(),
  critic: z.unknown().optional(),
});

export const failureRoleSchema = z.object({
  id: z.string(),
  provider: z.string(),
  model: z.string(),
  fallbacks: z.array(z.object({ provider: z.string(), model: z.string() })).default([]),
});
