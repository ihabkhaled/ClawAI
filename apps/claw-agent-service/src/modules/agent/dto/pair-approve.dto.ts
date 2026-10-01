import { z } from 'zod';
import { DeviceTokenClass, MobileDeviceScope } from '@claw/shared-types';
import { DeviceScope } from '../../../common/enums/device-scope.enum';
import { scopesFitTokenClass } from '../../../common/utilities/device.utility';

const PAIRING_CODE_PATTERN = /^[\w-]{40,80}$/;

export const pairApproveSchema = z
  .object({
    pairingCode: z.string().regex(PAIRING_CODE_PATTERN, 'Invalid pairing code format'),
    scopes: z
      .array(z.union([z.nativeEnum(DeviceScope), z.nativeEnum(MobileDeviceScope)]))
      .min(1)
      .max(16),
    deviceName: z.string().min(1).max(128).optional(),
    // F097. Absent means the desktop agent token, exactly as before.
    tokenClass: z.nativeEnum(DeviceTokenClass).default(DeviceTokenClass.DEVICE),
  })
  .refine((dto) => scopesFitTokenClass(dto.scopes, dto.tokenClass), {
    message: 'scopes do not fit the token class',
    path: ['scopes'],
  });

export type PairApproveDto = z.infer<typeof pairApproveSchema>;
