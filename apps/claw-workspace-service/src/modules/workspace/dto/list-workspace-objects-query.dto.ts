import { z } from 'zod';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';

export const listWorkspaceObjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  connectorId: z.string().max(128).optional(),
  type: z.nativeEnum(WorkspaceObjectType).optional(),
});

export type ListWorkspaceObjectsQueryDto = z.infer<typeof listWorkspaceObjectsQuerySchema>;
