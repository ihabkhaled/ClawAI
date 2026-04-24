import { WorkspaceActionStatus } from '@/enums/workspace-action-status.enum';
import { WorkspaceActionType } from '@/enums/workspace-action-type.enum';

export const WORKSPACE_ACTION_STATUS_VARIANT: Record<
  WorkspaceActionStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  [WorkspaceActionStatus.PENDING_APPROVAL]: 'outline',
  [WorkspaceActionStatus.APPROVED]: 'secondary',
  [WorkspaceActionStatus.EXECUTING]: 'secondary',
  [WorkspaceActionStatus.EXECUTED]: 'default',
  [WorkspaceActionStatus.FAILED]: 'destructive',
  [WorkspaceActionStatus.REJECTED]: 'outline',
  [WorkspaceActionStatus.EXPIRED]: 'outline',
  [WorkspaceActionStatus.EDITED]: 'outline',
};

export const WORKSPACE_ACTION_STATUS_I18N_KEY: Record<WorkspaceActionStatus, string> = {
  [WorkspaceActionStatus.PENDING_APPROVAL]: 'workspaceActions.pendingApproval',
  [WorkspaceActionStatus.APPROVED]: 'workspaceActions.approved',
  [WorkspaceActionStatus.EXECUTING]: 'workspaceActions.executing',
  [WorkspaceActionStatus.EXECUTED]: 'workspaceActions.executed',
  [WorkspaceActionStatus.FAILED]: 'workspaceActions.failed',
  [WorkspaceActionStatus.REJECTED]: 'workspaceActions.rejected',
  [WorkspaceActionStatus.EXPIRED]: 'workspaceActions.expired',
  [WorkspaceActionStatus.EDITED]: 'workspaceActions.edited',
};

export const WORKSPACE_ACTION_TYPE_LABEL: Record<WorkspaceActionType, string> = {
  [WorkspaceActionType.CREATE_ISSUE]: 'Create Issue',
  [WorkspaceActionType.CREATE_ISSUE_COMMENT]: 'Add Issue Comment',
  [WorkspaceActionType.CREATE_PR_DESCRIPTION]: 'Create PR Description',
  [WorkspaceActionType.CREATE_TICKET]: 'Create Ticket',
  [WorkspaceActionType.ADD_TICKET_COMMENT]: 'Add Ticket Comment',
  [WorkspaceActionType.SEND_SLACK_MESSAGE]: 'Send Slack Message',
  [WorkspaceActionType.SEND_EMAIL]: 'Send Email',
  [WorkspaceActionType.REPLY_EMAIL]: 'Reply Email',
  [WorkspaceActionType.UPDATE_JIRA_ISSUE]: 'Update Jira Issue',
  [WorkspaceActionType.COMMENT_JIRA]: 'Comment on Jira Issue',
  [WorkspaceActionType.COMMENT_PR]: 'Comment on PR',
  [WorkspaceActionType.APPROVE_PR]: 'Approve PR',
  [WorkspaceActionType.ADD_PR_SUGGESTION]: 'Add PR Suggestion',
  [WorkspaceActionType.SEND_SLACK]: 'Send Slack',
  [WorkspaceActionType.REPLY_SLACK]: 'Reply Slack',
  [WorkspaceActionType.EDIT_CONFLUENCE]: 'Edit Confluence Page',
  [WorkspaceActionType.CREATE_CONFLUENCE]: 'Create Confluence Page',
  [WorkspaceActionType.UPLOAD_DRIVE]: 'Upload to Drive',
  [WorkspaceActionType.MOVE_DRIVE]: 'Move in Drive',
  [WorkspaceActionType.CREATE_USER_STORY_FROM_FIGMA]: 'Create User Story from Figma',
  [WorkspaceActionType.CREATE_JIRA_FROM_FIGMA]: 'Create Jira Ticket from Figma',
  [WorkspaceActionType.POST_FIGMA_COMMENT]: 'Post Figma Comment',
};
