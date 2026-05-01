import { z } from 'zod';

import { CapabilityClass } from '../../../common/enums/capability-class.enum';
import { CapabilityOperation } from '../../../common/enums/capability-operation.enum';

/**
 * UndoPlan step shape — bounded recursion of capability calls the CLI
 * is permitted to execute during rollback without fresh approval.
 */
const undoPlanStepSchema = z.object({
  capabilityClass: z.nativeEnum(CapabilityClass),
  capabilityOperation: z.nativeEnum(CapabilityOperation),
  targetDescriptor: z.record(z.string(), z.unknown()),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const completeCapabilitySchema = z.object({
  success: z.boolean(),
  result: z.record(z.string(), z.unknown()).optional(),
  errorMessage: z.string().max(8000).optional(),
  undoPlan: z
    .object({
      steps: z.array(undoPlanStepSchema).max(50),
      notes: z.string().max(500).optional(),
    })
    .optional(),
  noUndoReason: z.string().max(500).optional(),
});

export type CompleteCapabilityDto = z.infer<typeof completeCapabilitySchema>;
