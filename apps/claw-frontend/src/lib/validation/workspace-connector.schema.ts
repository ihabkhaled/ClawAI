import { z } from 'zod';

import { WorkspacePermissionLevel, WorkspaceProvider } from '@/enums';

export const workspacePermissionLevels = Object.values(WorkspacePermissionLevel);

export const createWorkspaceConnectorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Connector name is required')
    .max(100, 'Connector name must be at most 100 characters'),
  provider: z.nativeEnum(WorkspaceProvider, {
    errorMap: (): { message: string } => ({
      message: 'Please select a valid workspace provider',
    }),
  }),
  permissionLevel: z.nativeEnum(WorkspacePermissionLevel, {
    errorMap: (): { message: string } => ({
      message: 'Please select a valid permission level',
    }),
  }),
});

export type CreateWorkspaceConnectorInput = z.infer<typeof createWorkspaceConnectorSchema>;
