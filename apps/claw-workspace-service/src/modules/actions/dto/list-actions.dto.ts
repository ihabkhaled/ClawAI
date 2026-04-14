import { z } from 'zod';
import { WorkspaceActionStatus } from '../../../common/enums/workspace-action-status.enum';

export const listActionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(WorkspaceActionStatus).optional(),
  connectorId: z.string().max(128).optional(),
});

export type ListActionsQueryDto = z.infer<typeof listActionsQuerySchema>;
