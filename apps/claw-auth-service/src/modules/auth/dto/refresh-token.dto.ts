import { z } from 'zod';

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required')
    .max(256, 'Refresh token must be at most 256 characters'),
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
