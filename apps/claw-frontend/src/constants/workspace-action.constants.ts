import { WorkspaceActionStatus } from '@/enums/workspace-action-status.enum';
import { WorkspaceActionType } from '@/enums/workspace-action-type.enum';

export const WORKSPACE_ACTION_STATUS_VARIANT: Record<
  WorkspaceActionStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  [WorkspaceActionStatus.PENDING_APPROVAL]: 'outline',
  [WorkspaceActionStatus.EXECUTING]: 'secondary',
  [WorkspaceActionStatus.EXECUTED]: 'default',
  [WorkspaceActionStatus.FAILED]: 'destructive',
  [WorkspaceActionStatus.REJECTED]: 'outline',
};

export const WORKSPACE_ACTION_STATUS_I18N_KEY: Record<WorkspaceActionStatus, string> = {
  [WorkspaceActionStatus.PENDING_APPROVAL]: 'workspaceActions.pendingApproval',
  [WorkspaceActionStatus.EXECUTING]: 'workspaceActions.executing',
  [WorkspaceActionStatus.EXECUTED]: 'workspaceActions.executed',
  [WorkspaceActionStatus.FAILED]: 'workspaceActions.failed',
  [WorkspaceActionStatus.REJECTED]: 'workspaceActions.rejected',
};

export const WORKSPACE_ACTION_TYPE_LABEL: Record<WorkspaceActionType, string> = {
  [WorkspaceActionType.CREATE_ISSUE]: 'Create Issue',
  [WorkspaceActionType.CREATE_ISSUE_COMMENT]: 'Add Issue Comment',
  [WorkspaceActionType.CREATE_PR_DESCRIPTION]: 'Create PR Description',
  [WorkspaceActionType.CREATE_TICKET]: 'Create Ticket',
  [WorkspaceActionType.ADD_TICKET_COMMENT]: 'Add Ticket Comment',
  [WorkspaceActionType.SEND_SLACK_MESSAGE]: 'Send Slack Message',
};
