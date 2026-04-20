import { z } from 'zod';

const REFRESH_TOKEN_PATTERN = /^[\w-]{40,200}$/;

export const refreshSchema = z.object({
  refreshToken: z.string().regex(REFRESH_TOKEN_PATTERN, 'Invalid refresh token format'),
});

export type RefreshDto = z.infer<typeof refreshSchema>;
