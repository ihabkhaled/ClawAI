import { z } from 'zod';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

export const oauthInitSchema = z.object({
  provider: z.nativeEnum(WorkspaceProvider),
  redirectUri: z.string().url().max(500),
  scopes: z.array(z.string().max(100)).max(20).optional().default([]),
});

export type OAuthInitDto = z.infer<typeof oauthInitSchema>;
