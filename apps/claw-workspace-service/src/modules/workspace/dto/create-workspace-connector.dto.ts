import { z } from 'zod';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import { WorkspacePermissionLevel } from '../../../common/enums/workspace-permission-level.enum';

export const createWorkspaceConnectorSchema = z.object({
  name: z.string().min(1).max(100),
  provider: z.nativeEnum(WorkspaceProvider),
  permissionLevel: z
    .nativeEnum(WorkspacePermissionLevel)
    .optional()
    .default(WorkspacePermissionLevel.READ),
  accessToken: z.string().max(2048).optional(),
  refreshToken: z.string().max(2048).optional(),
  expiresAt: z.string().datetime().optional(),
  scopes: z.array(z.string().max(100)).max(50).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateWorkspaceConnectorDto = z.infer<typeof createWorkspaceConnectorSchema>;
