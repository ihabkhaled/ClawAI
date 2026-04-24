import type { AiActionKind } from '../enums/ai-action-kind.enum';
import type { WorkspaceActionType } from '../enums/workspace-action-type.enum';

import type { WorkspaceConnector, WorkspaceObject } from './workspace.types';

export type FigmaDesignMetadata = {
  fileKey: string;
  nodeId: string | null;
  thumbnailUrl: string | null;
  lastModifiedBy: string | null;
  teamName: string | null;
  projectName: string | null;
  componentCount: number | null;
  webUrl: string | null;
};

export type UseFigmaPageResult = {
  connector: WorkspaceConnector | undefined;
  designs: WorkspaceObject[];
  isLoading: boolean;
  isError: boolean;
  selectedDesign: WorkspaceObject | null;
  aiDialogKind: AiActionKind | null;
  handleSelectDesign: (design: WorkspaceObject) => void;
  handleCloseDialog: () => void;
  handleOpenAiAction: (kind: AiActionKind) => void;
  handleCloseAiAction: () => void;
  handleCreateAction: (actionType: WorkspaceActionType, payload: Record<string, unknown>) => void;
  isDraftPending: boolean;
};
