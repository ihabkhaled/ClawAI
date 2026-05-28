import { z } from 'zod';

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  isAssignable: z.boolean().optional(),
});

export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;
