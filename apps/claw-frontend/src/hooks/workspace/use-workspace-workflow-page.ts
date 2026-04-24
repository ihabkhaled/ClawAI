import { useState } from 'react';

import type { AiActionKind } from '../../enums/ai-action-kind.enum';
import type { UseWorkspaceWorkflowPageResult } from '../../types/workspace-workflow.types';

import { useWorkflowItems } from './use-workflow-items';
import { useWorkspaceObjects } from './use-workspace-objects';

export function useWorkspaceWorkflowPage(): UseWorkspaceWorkflowPageResult {
  const { data: objectsData, isLoading, isError } = useWorkspaceObjects();
  const [aiDialogKind, setAiDialogKind] = useState<AiActionKind | null>(null);

  const { selectedItems, handleAddItem, handleRemoveItem, handleClearItems, combinedContext } =
    useWorkflowItems();

  const handleOpenAiAction = (kind: AiActionKind): void => {
    setAiDialogKind(kind);
  };

  const handleCloseAiAction = (): void => {
    setAiDialogKind(null);
  };

  return {
    objects: objectsData?.data ?? [],
    isLoading,
    isError,
    selectedItems,
    aiDialogKind,
    handleAddItem,
    handleRemoveItem,
    handleClearItems,
    handleOpenAiAction,
    handleCloseAiAction,
    combinedContext,
  };
}
