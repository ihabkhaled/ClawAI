import { z } from 'zod';

export const oauthCallbackSchema = z.object({
  code: z.string().min(1).max(2048),
  state: z.string().min(1).max(256),
  redirectUri: z.string().url().max(500),
});

export type OAuthCallbackDto = z.infer<typeof oauthCallbackSchema>;
