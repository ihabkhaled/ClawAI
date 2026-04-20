import { z } from 'zod';
import { DeviceScope } from '../../../common/enums/device-scope.enum';

const PAIRING_CODE_PATTERN = /^[\w-]{40,80}$/;

export const pairApproveSchema = z.object({
  pairingCode: z.string().regex(PAIRING_CODE_PATTERN, 'Invalid pairing code format'),
  scopes: z.array(z.nativeEnum(DeviceScope)).min(1).max(16),
  deviceName: z.string().min(1).max(128).optional(),
});

export type PairApproveDto = z.infer<typeof pairApproveSchema>;
