import { useState } from 'react';

import type { AiActionKind } from '../../enums/ai-action-kind.enum';
import type { WorkspaceActionType } from '../../enums/workspace-action-type.enum';
import { WorkspaceObjectType } from '../../enums/workspace-object-type.enum';
import { WorkspaceProvider } from '../../enums/workspace-provider.enum';
import type { UseFigmaPageResult } from '../../types/figma.types';
import type { WorkspaceObject } from '../../types/workspace.types';

import { useCreateWorkspaceAction } from './use-workspace-action-mutations';
import { useWorkspaceConnectors } from './use-workspace-connectors';
import { useWorkspaceObjects } from './use-workspace-objects';

export function useFigmaPage(): UseFigmaPageResult {
  const { data: connectorsData } = useWorkspaceConnectors({ provider: WorkspaceProvider.FIGMA });
  const connector = connectorsData?.data?.[0];

  const {
    data: designsData,
    isLoading,
    isError,
  } = useWorkspaceObjects(
    connector !== undefined
      ? { connectorId: connector.id, type: WorkspaceObjectType.FILE }
      : undefined,
  );

  const [selectedDesign, setSelectedDesign] = useState<WorkspaceObject | null>(null);
  const [aiDialogKind, setAiDialogKind] = useState<AiActionKind | null>(null);
  const { mutate: createAction, isPending: isDraftPending } = useCreateWorkspaceAction();

  const handleSelectDesign = (design: WorkspaceObject): void => {
    setSelectedDesign(design);
  };

  const handleCloseDialog = (): void => {
    setSelectedDesign(null);
  };

  const handleOpenAiAction = (kind: AiActionKind): void => {
    setAiDialogKind(kind);
  };

  const handleCloseAiAction = (): void => {
    setAiDialogKind(null);
  };

  const handleCreateAction = (
    actionType: WorkspaceActionType,
    payload: Record<string, unknown>,
  ): void => {
    if (connector === undefined) {
      return;
    }
    createAction({ connectorId: connector.id, actionType, payload });
  };

  return {
    connector,
    designs: designsData?.data ?? [],
    isLoading,
    isError,
    selectedDesign,
    aiDialogKind,
    handleSelectDesign,
    handleCloseDialog,
    handleOpenAiAction,
    handleCloseAiAction,
    handleCreateAction,
    isDraftPending,
  };
}
