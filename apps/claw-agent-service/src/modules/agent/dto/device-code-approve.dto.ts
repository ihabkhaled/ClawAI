import { z } from 'zod';
import { DeviceScope } from '../../../common/enums/device-scope.enum';

const USER_CODE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export const deviceCodeApproveSchema = z.object({
  userCode: z.string().regex(USER_CODE_PATTERN, 'Invalid user code format'),
  scopes: z.array(z.nativeEnum(DeviceScope)).min(1).max(16),
  deviceName: z.string().min(1).max(128).optional(),
});

export type DeviceCodeApproveDto = z.infer<typeof deviceCodeApproveSchema>;

export const deviceCodeDenySchema = z.object({
  userCode: z.string().regex(USER_CODE_PATTERN, 'Invalid user code format'),
});

export type DeviceCodeDenyDto = z.infer<typeof deviceCodeDenySchema>;
