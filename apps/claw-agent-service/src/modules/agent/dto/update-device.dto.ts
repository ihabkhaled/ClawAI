import { z } from 'zod';
import { MobileDeviceScope } from '@claw/shared-types';
import { DeviceScope } from '../../../common/enums/device-scope.enum';

export const updateDeviceSchema = z
  .object({
    name: z.string().min(1).max(128).optional(),
    scopes: z
      .array(z.union([z.nativeEnum(DeviceScope), z.nativeEnum(MobileDeviceScope)]))
      .min(1)
      .max(16)
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.scopes !== undefined, {
    message: 'At least one of name or scopes must be provided',
  });

export type UpdateDeviceDto = z.infer<typeof updateDeviceSchema>;
