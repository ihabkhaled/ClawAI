/**
 * The canonical, provider-neutral event taxonomy from
 * ClawAI_Workspace_Automation_Prompt_Pack Phase 03. Not every provider maps
 * to every value — WorkspaceEventMapperService only emits the subset a given
 * provider's webhook payload actually supports; unmapped members exist so
 * the vocabulary is stable and complete as later phases (04+) add sources
 * beyond webhooks (delta sync, realtime push) that populate the rest.
 */
export enum WorkspaceCanonicalEventType {
  EMAIL_RECEIVED = 'EMAIL_RECEIVED',
  EMAIL_REPLIED = 'EMAIL_REPLIED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  MENTION_RECEIVED = 'MENTION_RECEIVED',
  PR_OPENED = 'PR_OPENED',
  PR_UPDATED = 'PR_UPDATED',
  PR_REVIEWED = 'PR_REVIEWED',
  PR_MERGED = 'PR_MERGED',
  CI_FAILED = 'CI_FAILED',
  CI_SUCCEEDED = 'CI_SUCCEEDED',
  ISSUE_CREATED = 'ISSUE_CREATED',
  ISSUE_UPDATED = 'ISSUE_UPDATED',
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_STATUS_CHANGED = 'TICKET_STATUS_CHANGED',
  DOCUMENT_CREATED = 'DOCUMENT_CREATED',
  DOCUMENT_UPDATED = 'DOCUMENT_UPDATED',
  FILE_UPDATED = 'FILE_UPDATED',
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  MEETING_STARTED = 'MEETING_STARTED',
  MEETING_ENDED = 'MEETING_ENDED',
  COMMENT_CREATED = 'COMMENT_CREATED',
}
