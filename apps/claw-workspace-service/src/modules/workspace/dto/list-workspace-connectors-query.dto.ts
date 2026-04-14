import { z } from 'zod';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';

export const listWorkspaceConnectorsQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(1000).optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  provider: z.nativeEnum(WorkspaceProvider).optional(),
  status: z.nativeEnum(WorkspaceConnectorStatus).optional(),
  isEnabled: z.coerce.boolean().optional(),
});

export type ListWorkspaceConnectorsQueryDto = z.infer<typeof listWorkspaceConnectorsQuerySchema>;
