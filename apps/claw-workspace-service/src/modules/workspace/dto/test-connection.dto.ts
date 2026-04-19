import { z } from 'zod';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

export const testConnectionSchema = z.object({
  provider: z.nativeEnum(WorkspaceProvider),
  providerAppConfigId: z.string().trim().min(1).max(64),
});
export type TestConnectionDto = z.infer<typeof testConnectionSchema>;

export const testPatSchema = z.object({
  provider: z.nativeEnum(WorkspaceProvider),
  personalAccessToken: z.string().trim().min(1).max(1000),
  baseUrl: z.string().trim().url().max(500).optional(),
});
export type TestPatDto = z.infer<typeof testPatSchema>;
