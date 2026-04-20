import { z } from 'zod';

const DEVICE_CODE_PATTERN = /^[\w-]{40,80}$/;

export const deviceCodeTokenSchema = z.object({
  deviceCode: z.string().regex(DEVICE_CODE_PATTERN, 'Invalid device code format'),
});

export type DeviceCodeTokenDto = z.infer<typeof deviceCodeTokenSchema>;
