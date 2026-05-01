import { z } from 'zod';

import { CapabilityBlastRadius } from '../../../common/enums/capability-blast-radius.enum';
import { CapabilityClass } from '../../../common/enums/capability-class.enum';
import { CapabilityOperation } from '../../../common/enums/capability-operation.enum';
import { CapabilityReversibility } from '../../../common/enums/capability-reversibility.enum';
import { DeviceScope } from '../../../common/enums/device-scope.enum';

/**
 * Stream 10 — capability proposal payload (CLI → backend).
 *
 * Validated by ZodValidationPipe at the controller. Free-form
 * `targetDescriptor` and `payload` are JSON; per-class CLI providers
 * impose their own structural validation downstream.
 */
export const proposeCapabilitySchema = z.object({
  deviceId: z.string().cuid(),
  capabilityClass: z.nativeEnum(CapabilityClass),
  capabilityOperation: z.nativeEnum(CapabilityOperation),
  targetDescriptor: z.record(z.string(), z.unknown()),
  payload: z.record(z.string(), z.unknown()).default({}),
  blastRadius: z.nativeEnum(CapabilityBlastRadius),
  reversibility: z.nativeEnum(CapabilityReversibility),
  requiredScopes: z.array(z.nativeEnum(DeviceScope)).max(20).default([]),
  recipeRunId: z.string().cuid().optional(),
  parentInvocationId: z.string().cuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ProposeCapabilityDto = z.infer<typeof proposeCapabilitySchema>;
