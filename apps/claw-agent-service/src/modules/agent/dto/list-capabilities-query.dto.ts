import { z } from 'zod';

import { CapabilityClass } from '../../../common/enums/capability-class.enum';
import { CapabilityInvocationStatus } from '../../../common/enums/capability-invocation-status.enum';

export const listCapabilitiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(CapabilityInvocationStatus).optional(),
  capabilityClass: z.nativeEnum(CapabilityClass).optional(),
  recipeRunId: z.string().cuid().optional(),
  deviceId: z.string().cuid().optional(),
});

export type ListCapabilitiesQueryDto = z.infer<typeof listCapabilitiesQuerySchema>;
