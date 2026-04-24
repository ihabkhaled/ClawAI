import { WorkspaceActionStatus } from '@/enums/workspace-action-status.enum';

export const APPROVALS_PENDING_STATUSES: ReadonlySet<WorkspaceActionStatus> = new Set([
  WorkspaceActionStatus.PENDING_APPROVAL,
  WorkspaceActionStatus.EDITED,
]);

export const APPROVALS_PAGE_SIZE = 50;
