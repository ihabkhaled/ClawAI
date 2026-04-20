import { z } from 'zod';

export const revokeDeviceSchema = z.object({
  reason: z.string().min(1).max(512).optional(),
});

export type RevokeDeviceDto = z.infer<typeof revokeDeviceSchema>;
