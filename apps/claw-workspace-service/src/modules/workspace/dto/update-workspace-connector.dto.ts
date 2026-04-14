import { z } from 'zod';
import { WorkspacePermissionLevel } from '../../../common/enums/workspace-permission-level.enum';

export const updateWorkspaceConnectorSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    permissionLevel: z.nativeEnum(WorkspacePermissionLevel).optional(),
    isEnabled: z.boolean().optional(),
    scopes: z.array(z.string().max(100)).max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type UpdateWorkspaceConnectorDto = z.infer<typeof updateWorkspaceConnectorSchema>;
