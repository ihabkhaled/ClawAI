import { useState } from 'react';

import type { AiActionKind } from '../../enums/ai-action-kind.enum';
import type { WorkspaceActionType } from '../../enums/workspace-action-type.enum';
import { WorkspaceObjectType } from '../../enums/workspace-object-type.enum';
import { WorkspaceProvider } from '../../enums/workspace-provider.enum';
import type { UseConfluencePageResult } from '../../types/confluence.types';
import type { WorkspaceObject } from '../../types/workspace.types';

import { useCreateWorkspaceAction } from './use-workspace-action-mutations';
import { useWorkspaceConnectors } from './use-workspace-connectors';
import { useWorkspaceObjects } from './use-workspace-objects';

export function useConfluencePage(): UseConfluencePageResult {
  const { data: connectorsData } = useWorkspaceConnectors({
    provider: WorkspaceProvider.CONFLUENCE,
  });
  const connector = connectorsData?.data?.[0];

  const {
    data: pagesData,
    isLoading,
    isError,
  } = useWorkspaceObjects(
    connector !== undefined
      ? { connectorId: connector.id, type: WorkspaceObjectType.DOCUMENT }
      : undefined,
  );

  const [selectedPage, setSelectedPage] = useState<WorkspaceObject | null>(null);
  const [aiDialogKind, setAiDialogKind] = useState<AiActionKind | null>(null);
  const { mutate: createAction, isPending: isDraftPending } = useCreateWorkspaceAction();

  const handleSelectPage = (page: WorkspaceObject): void => {
    setSelectedPage(page);
  };

  const handleCloseDialog = (): void => {
    setSelectedPage(null);
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
    pages: pagesData?.data ?? [],
    isLoading,
    isError,
    selectedPage,
    aiDialogKind,
    handleSelectPage,
    handleCloseDialog,
    handleOpenAiAction,
    handleCloseAiAction,
    handleCreateAction,
    isDraftPending,
  };
}
