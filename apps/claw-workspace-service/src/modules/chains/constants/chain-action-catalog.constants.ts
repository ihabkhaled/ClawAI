import { WorkspaceActionType } from '../../../common/enums/workspace-action-type.enum';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

// Phase 09 — the write actions an NL chain draft is allowed to target, per
// provider. Mirrors each adapter's actionType dispatch (see e.g.
// jira.adapter.ts, slack.adapter.ts, github-write-actions.helper.ts).
//
// CREATE_JIRA_FROM_FIGMA / CREATE_USER_STORY_FROM_FIGMA are deliberately
// excluded: they dispatch through the Jira adapter but require a Figma
// source payload shape that has nothing to do with "the user only has a
// Jira connector" — teaching the model that composite contract is out of
// scope for a first NL-drafting pass.
export const CHAIN_ACTION_CATALOG: Record<
  WorkspaceProvider,
  Array<{ actionType: WorkspaceActionType; label: string }>
> = {
  [WorkspaceProvider.JIRA]: [
    { actionType: WorkspaceActionType.CREATE_TICKET, label: 'Create a Jira ticket' },
    { actionType: WorkspaceActionType.UPDATE_JIRA_ISSUE, label: 'Update a Jira issue' },
    { actionType: WorkspaceActionType.COMMENT_JIRA, label: 'Comment on a Jira issue' },
    { actionType: WorkspaceActionType.ADD_TICKET_COMMENT, label: 'Add a comment to a ticket' },
  ],
  [WorkspaceProvider.SLACK]: [
    { actionType: WorkspaceActionType.SEND_SLACK_MESSAGE, label: 'Send a Slack message' },
    { actionType: WorkspaceActionType.SEND_SLACK, label: 'Send a Slack message' },
    { actionType: WorkspaceActionType.REPLY_SLACK, label: 'Reply in a Slack thread' },
  ],
  [WorkspaceProvider.GMAIL]: [
    { actionType: WorkspaceActionType.SEND_EMAIL, label: 'Send an email' },
    { actionType: WorkspaceActionType.REPLY_EMAIL, label: 'Reply to an email' },
    { actionType: WorkspaceActionType.CREATE_DRAFT, label: 'Create an email draft' },
  ],
  [WorkspaceProvider.GITHUB]: [
    { actionType: WorkspaceActionType.CREATE_ISSUE, label: 'Create a GitHub issue' },
    { actionType: WorkspaceActionType.CREATE_ISSUE_COMMENT, label: 'Comment on a GitHub issue' },
    { actionType: WorkspaceActionType.CREATE_PR_DESCRIPTION, label: 'Write a PR description' },
    { actionType: WorkspaceActionType.COMMENT_PR, label: 'Comment on a PR' },
    { actionType: WorkspaceActionType.APPROVE_PR, label: 'Approve a PR' },
    { actionType: WorkspaceActionType.ADD_PR_SUGGESTION, label: 'Suggest a PR change' },
  ],
  [WorkspaceProvider.GITLAB]: [
    { actionType: WorkspaceActionType.CREATE_GITLAB_ISSUE, label: 'Create a GitLab issue' },
    { actionType: WorkspaceActionType.COMMENT_GITLAB_ISSUE, label: 'Comment on a GitLab issue' },
    { actionType: WorkspaceActionType.CREATE_MR_COMMENT, label: 'Comment on a merge request' },
    { actionType: WorkspaceActionType.APPROVE_MR, label: 'Approve a merge request' },
    {
      actionType: WorkspaceActionType.UPDATE_MR_DESCRIPTION,
      label: 'Update a merge request description',
    },
    { actionType: WorkspaceActionType.ADD_MR_SUGGESTION, label: 'Suggest a merge request change' },
    {
      actionType: WorkspaceActionType.ADD_MR_IMAGE_COMMENT,
      label: 'Comment on a merge request image',
    },
  ],
  [WorkspaceProvider.BITBUCKET]: [
    { actionType: WorkspaceActionType.CREATE_PR_COMMENT_BB, label: 'Comment on a Bitbucket PR' },
    { actionType: WorkspaceActionType.APPROVE_PR_BB, label: 'Approve a Bitbucket PR' },
    { actionType: WorkspaceActionType.CREATE_BITBUCKET_ISSUE, label: 'Create a Bitbucket issue' },
  ],
  [WorkspaceProvider.CONFLUENCE]: [
    { actionType: WorkspaceActionType.CREATE_CONFLUENCE, label: 'Create a Confluence page' },
    { actionType: WorkspaceActionType.EDIT_CONFLUENCE, label: 'Edit a Confluence page' },
  ],
  [WorkspaceProvider.FIGMA]: [
    { actionType: WorkspaceActionType.POST_FIGMA_COMMENT, label: 'Comment on a Figma file' },
  ],
  [WorkspaceProvider.CLICKUP]: [
    { actionType: WorkspaceActionType.CREATE_CLICKUP_TASK, label: 'Create a ClickUp task' },
    { actionType: WorkspaceActionType.UPDATE_CLICKUP_TASK, label: 'Update a ClickUp task' },
    { actionType: WorkspaceActionType.COMMENT_CLICKUP_TASK, label: 'Comment on a ClickUp task' },
  ],
  [WorkspaceProvider.GOOGLE_DRIVE]: [
    { actionType: WorkspaceActionType.UPLOAD_DRIVE, label: 'Upload a file to Drive' },
    { actionType: WorkspaceActionType.MOVE_DRIVE, label: 'Move a file in Drive' },
  ],
  [WorkspaceProvider.MICROSOFT_ONEDRIVE]: [
    { actionType: WorkspaceActionType.UPLOAD_ONEDRIVE, label: 'Upload a file to OneDrive' },
    { actionType: WorkspaceActionType.MOVE_ONEDRIVE, label: 'Move a file in OneDrive' },
  ],
  [WorkspaceProvider.MICROSOFT_SHAREPOINT]: [
    { actionType: WorkspaceActionType.UPLOAD_SHAREPOINT, label: 'Upload a file to SharePoint' },
    {
      actionType: WorkspaceActionType.CREATE_SHAREPOINT_LIST_ITEM,
      label: 'Create a SharePoint list item',
    },
    {
      actionType: WorkspaceActionType.UPDATE_SHAREPOINT_LIST_ITEM,
      label: 'Update a SharePoint list item',
    },
  ],
  // Read-only providers (Phase 01's matrix) — no write actions to offer.
  [WorkspaceProvider.GOOGLE_CALENDAR]: [],
  [WorkspaceProvider.OUTLOOK_CALENDAR]: [],
};
