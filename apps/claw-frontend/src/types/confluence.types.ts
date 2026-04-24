import type { AiActionKind } from '../enums/ai-action-kind.enum';
import type { WorkspaceActionType } from '../enums/workspace-action-type.enum';

import type { WorkspaceConnector, WorkspaceObject } from './workspace.types';

export type ConfluencePageMetadata = {
  spaceKey: string;
  spaceName: string;
  author: string | null;
  lastModifiedBy: string | null;
  version: number | null;
  labels: string[];
  parentTitle: string | null;
  webUrl: string | null;
};

export type UseConfluencePageResult = {
  connector: WorkspaceConnector | undefined;
  pages: WorkspaceObject[];
  isLoading: boolean;
  isError: boolean;
  selectedPage: WorkspaceObject | null;
  aiDialogKind: AiActionKind | null;
  handleSelectPage: (page: WorkspaceObject) => void;
  handleCloseDialog: () => void;
  handleOpenAiAction: (kind: AiActionKind) => void;
  handleCloseAiAction: () => void;
  handleCreateAction: (actionType: WorkspaceActionType, payload: Record<string, unknown>) => void;
  isDraftPending: boolean;
};
