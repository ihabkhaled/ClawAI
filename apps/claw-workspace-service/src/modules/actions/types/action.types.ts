import type { WorkspaceAction, WorkspaceConnector } from '../../../generated/prisma';

export type WorkspaceActionWithConnector = WorkspaceAction & {
  connector: Pick<WorkspaceConnector, 'id' | 'name' | 'provider' | 'status'>;
};

export type PaginatedWorkspaceActions = {
  data: WorkspaceActionWithConnector[];
  total: number;
  page: number;
  pageSize: number;
};

export type ActionGeneratedBy = {
  provider: string;
  model: string;
  displayName: string;
  mode: 'AUTO' | 'MANUAL';
  fallbackChain?: Array<{ provider: string; model: string }>;
};

export type ActionDraftRevision = {
  version: number;
  editedAt: string;
  editedBy: string;
  payload: Record<string, unknown>;
  reason?: string;
};

export type BulkApproveOutcome = {
  bulkGroupId: string;
  approvedActionIds: string[];
  blockedActionIds: string[];
  blockedReasons: Record<string, string>;
};
