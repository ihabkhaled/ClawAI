import type { AiActionKind } from '../enums/ai-action-kind.enum';
import type { WorkspaceActionType } from '../enums/workspace-action-type.enum';

import type { WorkspaceConnector, WorkspaceObject } from './workspace.types';

export type JiraTicketMetadata = {
  issueType: string;
  status: string;
  priority: string;
  assignee: string | null;
  reporter: string | null;
  project: string;
  projectKey: string;
  labels: string[];
  storyPoints: number | null;
  sprint: string | null;
  dueDate: string | null;
};

export type UseJiraPageResult = {
  connector: WorkspaceConnector | undefined;
  tickets: WorkspaceObject[];
  isLoading: boolean;
  isError: boolean;
  selectedTicket: WorkspaceObject | null;
  aiDialogKind: AiActionKind | null;
  handleSelectTicket: (ticket: WorkspaceObject) => void;
  handleCloseDialog: () => void;
  handleOpenAiAction: (kind: AiActionKind) => void;
  handleCloseAiAction: () => void;
  handleCreateAction: (actionType: WorkspaceActionType, payload: Record<string, unknown>) => void;
  isDraftPending: boolean;
};
