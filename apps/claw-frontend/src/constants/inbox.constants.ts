import { WorkspaceObjectType } from '@/enums/workspace-object-type.enum';
import { WorkspaceProvider } from '@/enums/workspace-provider.enum';

export const INBOX_DEFAULT_PAGE_LIMIT = 25;

export const INBOX_PROVIDER_FILTER_OPTIONS: WorkspaceProvider[] = [
  WorkspaceProvider.GMAIL,
  WorkspaceProvider.SLACK,
  WorkspaceProvider.JIRA,
  WorkspaceProvider.GITHUB,
  WorkspaceProvider.GITLAB,
  WorkspaceProvider.CONFLUENCE,
];

export const INBOX_TYPE_FILTER_OPTIONS: WorkspaceObjectType[] = [
  WorkspaceObjectType.EMAIL,
  WorkspaceObjectType.MESSAGE,
  WorkspaceObjectType.TICKET,
  WorkspaceObjectType.PULL_REQUEST,
  WorkspaceObjectType.ISSUE,
  WorkspaceObjectType.MEETING,
];
