import { z } from 'zod';
import { createRouterModelSchema } from './create-router-model.dto';

export const updateRouterModelSchema = createRouterModelSchema.partial().extend({
  overrideReason: z.string().min(1).max(500).optional(),
});

export type UpdateRouterModelDto = z.infer<typeof updateRouterModelSchema>;
