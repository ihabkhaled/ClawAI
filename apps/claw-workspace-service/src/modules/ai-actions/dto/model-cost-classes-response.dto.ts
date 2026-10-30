import { ModelCostClass } from '@claw/shared-types';
import { z } from 'zod';

/** routing-service's answer to the bulk cost-class lookup: `costClass: null` means no price. */
export const modelCostClassesResponseSchema = z.array(
  z.object({
    provider: z.string(),
    model: z.string(),
    costClass: z.nativeEnum(ModelCostClass).nullable(),
  }),
);
