import { z } from 'zod';
import { updateSchemaOf } from '../../../common/utilities/zod-update-schema.utility';
import { createRouterModelSchema } from './create-router-model.dto';

export const updateRouterModelSchema = updateSchemaOf(createRouterModelSchema).extend({
  overrideReason: z.string().min(1).max(500).optional(),
});

export type UpdateRouterModelDto = z.infer<typeof updateRouterModelSchema>;
