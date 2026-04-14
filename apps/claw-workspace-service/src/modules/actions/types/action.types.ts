import type { WorkspaceAction, WorkspaceConnector } from '../../../generated/prisma';

export type WorkspaceActionWithConnector = WorkspaceAction & {
  connector: Pick<WorkspaceConnector, 'id' | 'name' | 'provider'>;
};

export type PaginatedWorkspaceActions = {
  data: WorkspaceActionWithConnector[];
  total: number;
  page: number;
  pageSize: number;
};
