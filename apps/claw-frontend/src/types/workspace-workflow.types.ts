import type { AiActionKind } from '../enums/ai-action-kind.enum';

import type { WorkspaceObject } from './workspace.types';

export type UseWorkflowItemsResult = {
  selectedItems: WorkspaceObject[];
  handleAddItem: (item: WorkspaceObject) => void;
  handleRemoveItem: (id: string) => void;
  handleClearItems: () => void;
  combinedContext: string;
};

export type UseWorkspaceWorkflowPageResult = {
  objects: WorkspaceObject[];
  isLoading: boolean;
  isError: boolean;
  selectedItems: WorkspaceObject[];
  aiDialogKind: AiActionKind | null;
  handleAddItem: (item: WorkspaceObject) => void;
  handleRemoveItem: (id: string) => void;
  handleClearItems: () => void;
  handleOpenAiAction: (kind: AiActionKind) => void;
  handleCloseAiAction: () => void;
  combinedContext: string;
};
