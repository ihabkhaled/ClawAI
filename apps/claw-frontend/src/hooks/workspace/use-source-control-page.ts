import { useState } from 'react';

import { SOURCE_CONTROL_PROVIDERS } from '../../constants/source-control.constants';
import type { AiActionKind } from '../../enums/ai-action-kind.enum';
import type { WorkspaceActionType } from '../../enums/workspace-action-type.enum';
import { WorkspaceObjectType } from '../../enums/workspace-object-type.enum';
import type { UseSourceControlPageResult } from '../../types/source-control.types';
import type { WorkspaceObject } from '../../types/workspace.types';

import { useCreateWorkspaceAction } from './use-workspace-action-mutations';
import { useWorkspaceConnectors } from './use-workspace-connectors';
import { useWorkspaceObjects } from './use-workspace-objects';

export function useSourceControlPage(): UseSourceControlPageResult {
  const { data: connectorsData } = useWorkspaceConnectors();
  const connector = connectorsData?.data?.find((c) =>
    SOURCE_CONTROL_PROVIDERS.includes(c.provider),
  );

  const {
    data: prsData,
    isLoading,
    isError,
  } = useWorkspaceObjects(
    connector !== undefined
      ? { connectorId: connector.id, type: WorkspaceObjectType.PULL_REQUEST }
      : undefined,
  );

  const [selectedPr, setSelectedPr] = useState<WorkspaceObject | null>(null);
  const [aiDialogKind, setAiDialogKind] = useState<AiActionKind | null>(null);
  const { mutate: createAction, isPending: isDraftPending } = useCreateWorkspaceAction();

  const handleSelectPr = (pr: WorkspaceObject): void => {
    setSelectedPr(pr);
  };

  const handleCloseDialog = (): void => {
    setSelectedPr(null);
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
    pullRequests: prsData?.data ?? [],
    isLoading,
    isError,
    selectedPr,
    aiDialogKind,
    handleSelectPr,
    handleCloseDialog,
    handleOpenAiAction,
    handleCloseAiAction,
    handleCreateAction,
    isDraftPending,
  };
}
