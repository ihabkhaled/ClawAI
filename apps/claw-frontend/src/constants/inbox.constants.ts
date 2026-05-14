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

// v3 round 11 (Prompt 08) — object types whose raw content can be
// streamed + previewed via the file viewer modal. An inbox row only
// shows the "View file" action when its type is in this set.
export const INBOX_VIEWABLE_OBJECT_TYPES: ReadonlySet<string> = new Set<string>([
  WorkspaceObjectType.FILE,
  WorkspaceObjectType.DOCUMENT,
]);
