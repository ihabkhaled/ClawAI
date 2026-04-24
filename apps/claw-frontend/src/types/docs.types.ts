import type { AiActionKind } from '../enums/ai-action-kind.enum';
import type { WorkspaceActionType } from '../enums/workspace-action-type.enum';

import type { WorkspaceConnector, WorkspaceObject } from './workspace.types';

export type DocFileMetadata = {
  mimeType: string;
  fileSize: number | null;
  owner: string | null;
  lastModifiedBy: string | null;
  sharedWith: string[];
  webUrl: string | null;
  driveId: string | null;
  parentPath: string | null;
};

export type UseDocsPageResult = {
  connector: WorkspaceConnector | undefined;
  docs: WorkspaceObject[];
  isLoading: boolean;
  isError: boolean;
  selectedDoc: WorkspaceObject | null;
  aiDialogKind: AiActionKind | null;
  handleSelectDoc: (doc: WorkspaceObject) => void;
  handleCloseDialog: () => void;
  handleOpenAiAction: (kind: AiActionKind) => void;
  handleCloseAiAction: () => void;
  handleCreateAction: (actionType: WorkspaceActionType, payload: Record<string, unknown>) => void;
  isDraftPending: boolean;
};
